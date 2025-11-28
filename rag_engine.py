"""
RAG Engine for GovGrant Assist
Handles document ingestion, chunking, embedding, and retrieval
Implements specifications from PRD Section 3.3
"""
from typing import List, Optional, Tuple
import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from config import Config


class RAGEngine:
    """
    Retrieval-Augmented Generation Engine
    Handles document processing and semantic search
    """

    def __init__(self):
        """Initialize RAG engine with embeddings"""
        self.vector_store = None
        self.documents = []
        self.config = Config

        # Initialize embeddings based on provider
        if self.config.LLM_PROVIDER == "openai":
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=self.config.OPENAI_API_KEY
            )
        elif self.config.LLM_PROVIDER == "google":
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=self.config.GOOGLE_API_KEY
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {self.config.LLM_PROVIDER}")

    def extract_text_from_pdf(self, file_buffer) -> Tuple[str, dict]:
        """
        Extract text from PDF buffer

        Args:
            file_buffer: Streamlit file buffer

        Returns:
            Tuple of (extracted_text, metadata)
        """
        try:
            pdf_reader = pypdf.PdfReader(file_buffer)
            text_content = []
            metadata = {
                "filename": file_buffer.name,
                "total_pages": len(pdf_reader.pages),
                "page_texts": []
            }

            for page_num, page in enumerate(pdf_reader.pages, start=1):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(f"--- Page {page_num} ---\n{page_text}")
                    metadata["page_texts"].append({
                        "page": page_num,
                        "text": page_text
                    })

            full_text = "\n\n".join(text_content)
            return full_text, metadata

        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    def chunk_text(self, text: str, metadata: dict) -> List[Document]:
        """
        Split text into chunks using RecursiveCharacterTextSplitter
        Per PRD Section 3.3.2: Chunk size 1000, overlap 100

        Args:
            text: Full document text
            metadata: Document metadata

        Returns:
            List of LangChain Document objects
        """
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.config.CHUNK_SIZE,
            chunk_overlap=self.config.CHUNK_OVERLAP,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

        chunks = text_splitter.split_text(text)

        # Create Document objects with metadata
        documents = []
        for i, chunk in enumerate(chunks):
            # Try to determine which page this chunk is from
            page_num = self._find_page_number(chunk, metadata)

            doc = Document(
                page_content=chunk,
                metadata={
                    "chunk_id": i,
                    "source": metadata["filename"],
                    "page": page_num,
                    "total_chunks": len(chunks)
                }
            )
            documents.append(doc)

        return documents

    def _find_page_number(self, chunk: str, metadata: dict) -> int:
        """
        Heuristic to find which page a chunk belongs to

        Args:
            chunk: Text chunk
            metadata: Document metadata with page texts

        Returns:
            Page number (best guess)
        """
        # Look for page markers in chunk
        if "--- Page" in chunk:
            try:
                page_marker = chunk.split("--- Page ")[1].split(" ---")[0]
                return int(page_marker)
            except:
                pass

        # Search in page texts
        for page_info in metadata.get("page_texts", []):
            if chunk[:100] in page_info["text"]:
                return page_info["page"]

        return 1  # Default to page 1 if not found

    def ingest_document(self, file_buffer) -> dict:
        """
        Main ingestion pipeline: PDF -> Text -> Chunks -> Vectors

        Args:
            file_buffer: Streamlit uploaded file

        Returns:
            Ingestion statistics
        """
        # Extract text
        text, metadata = self.extract_text_from_pdf(file_buffer)

        if not text or len(text.strip()) == 0:
            raise ValueError("No text could be extracted from PDF")

        # Chunk text
        documents = self.chunk_text(text, metadata)
        self.documents = documents

        # Create vector store using FAISS
        self.vector_store = FAISS.from_documents(
            documents=documents,
            embedding=self.embeddings
        )

        stats = {
            "filename": metadata["filename"],
            "total_pages": metadata["total_pages"],
            "total_chunks": len(documents),
            "total_characters": len(text)
        }

        return stats

    def similarity_search(self, query: str, k: Optional[int] = None) -> List[Tuple[Document, float]]:
        """
        Perform semantic search in vector store

        Args:
            query: User query
            k: Number of results (defaults to Config.TOP_K_RESULTS)

        Returns:
            List of (Document, similarity_score) tuples
        """
        if not self.vector_store:
            raise ValueError("No document has been ingested. Please upload a PDF first.")

        k = k or self.config.TOP_K_RESULTS

        # Use similarity_search_with_score for better citation
        results = self.vector_store.similarity_search_with_score(query, k=k)

        return results

    def get_relevant_context(self, query: str, k: Optional[int] = None) -> str:
        """
        Get formatted context for LLM prompting

        Args:
            query: User query
            k: Number of chunks to retrieve

        Returns:
            Formatted context string with citations
        """
        results = self.similarity_search(query, k)

        if not results:
            return "No relevant information found in the document."

        context_parts = []
        for doc, score in results:
            page = doc.metadata.get("page", "Unknown")
            content = doc.page_content.strip()

            context_parts.append(
                f"[Page {page}]\n{content}\n"
            )

        return "\n---\n".join(context_parts)

    def clear(self):
        """Clear vector store and documents (for session reset)"""
        self.vector_store = None
        self.documents = []

    def is_ready(self) -> bool:
        """Check if engine has documents loaded"""
        return self.vector_store is not None
