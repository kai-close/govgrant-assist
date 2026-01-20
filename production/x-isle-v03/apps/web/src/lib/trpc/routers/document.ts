import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import {
  createTRPCRouter,
  protectedProcedure,
} from "../server";
import { documents } from "@/lib/db/schema";

// S3 client for MinIO
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = process.env.S3_BUCKET || "xisle";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

export const documentRouter = createTRPCRouter({
  /**
   * List user's documents
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.documents.findMany({
        where: eq(documents.userId, ctx.user.id),
        orderBy: [desc(documents.createdAt)],
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Get single document by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.userId, ctx.user.id)
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Get upload URL for new document
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File type not supported. Allowed: PDF, DOCX, DOC, PPT, PPTX",
        });
      }

      // Validate file size
      if (input.size > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large. Maximum size is 50MB",
        });
      }

      // Generate storage key
      const extension = input.filename.split(".").pop() || "bin";
      const storageKey = `documents/${ctx.user.id}/${nanoid()}.${extension}`;

      // Generate presigned URL
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: storageKey,
        ContentType: input.mimeType,
        ContentLength: input.size,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 300, // 5 minutes
      });

      return {
        uploadUrl,
        storageKey,
      };
    }),

  /**
   * Create document record after upload
   */
  create: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().positive(),
        storageKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create database record
      const [document] = await ctx.db
        .insert(documents)
        .values({
          userId: ctx.user.id,
          filename: input.filename,
          mimeType: input.mimeType,
          size: input.size,
          storageKey: input.storageKey,
          status: "pending",
        })
        .returning();

      // Trigger backend processing
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      try {
        const response = await fetch(`${backendUrl}/documents/${document.id}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_id: document.id,
            storage_key: input.storageKey,
            mime_type: input.mimeType,
            user_id: ctx.user.id,
          }),
        });

        if (!response.ok) {
          console.error("Backend processing request failed:", await response.text());
        }
      } catch (error) {
        console.error("Failed to trigger document processing:", error);
        // Don't fail the mutation - document is created, processing can be retried
      }

      return document;
    }),

  /**
   * Get document status (for polling)
   */
  getStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.userId, ctx.user.id)
        ),
        columns: {
          id: true,
          status: true,
          error: true,
          pageCount: true,
          processedAt: true,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Delete document
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get document first
      const document = await ctx.db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.userId, ctx.user.id)
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Delete from S3
      try {
        const command = new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: document.storageKey,
        });
        await s3Client.send(command);
      } catch (error) {
        console.error("Failed to delete from S3:", error);
        // Continue with DB deletion even if S3 fails
      }

      // Delete from database
      await ctx.db
        .delete(documents)
        .where(eq(documents.id, input.id));

      return { success: true };
    }),
});
