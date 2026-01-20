import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "@/lib/store/editor-store";

describe("useEditorStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useEditorStore.setState({
      presentationId: null,
      title: "Untitled Presentation",
      slides: [],
      theme: {
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        fontFamily: "Inter",
        headingFont: "Inter",
      },
      selectedSlideId: null,
      selectedCardIds: [],
      hoveredCardId: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      isSaving: false,
      isGenerating: false,
      sidebarTab: "slides",
      showGrid: true,
      snapToGrid: true,
      history: [],
      historyIndex: -1,
      clipboard: null,
    });
  });

  describe("slide operations", () => {
    it("should add a new slide", () => {
      const { addSlide } = useEditorStore.getState();

      addSlide();

      const { slides } = useEditorStore.getState();
      expect(slides).toHaveLength(1);
      expect(slides[0]).toHaveProperty("id");
      expect(slides[0]).toHaveProperty("cards");
      expect(slides[0].cards).toEqual([]);
    });

    it("should select a slide after adding", () => {
      const { addSlide } = useEditorStore.getState();

      addSlide();

      const { slides, selectedSlideId } = useEditorStore.getState();
      expect(selectedSlideId).toBe(slides[0].id);
    });

    it("should delete a slide", () => {
      const { addSlide, deleteSlide } = useEditorStore.getState();

      addSlide();
      addSlide();
      const { slides } = useEditorStore.getState();
      expect(slides).toHaveLength(2);

      const slideIdToDelete = slides[0].id;
      deleteSlide(slideIdToDelete);

      const { slides: afterDelete } = useEditorStore.getState();
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].id).not.toBe(slideIdToDelete);
    });

    it("should duplicate a slide", () => {
      const { addSlide, duplicateSlide } = useEditorStore.getState();

      addSlide();
      const { slides } = useEditorStore.getState();
      const slideId = slides[0].id;

      duplicateSlide(slideId);

      const { slides: afterDuplicate } = useEditorStore.getState();
      expect(afterDuplicate).toHaveLength(2);
      expect(afterDuplicate[0].id).not.toBe(afterDuplicate[1].id);
    });

    it("should reorder slides", () => {
      const { addSlide, reorderSlides } = useEditorStore.getState();

      addSlide();
      addSlide();
      addSlide();

      const { slides: before } = useEditorStore.getState();
      const firstSlideId = before[0].id;
      const lastSlideId = before[2].id;

      reorderSlides(0, 2);

      const { slides: after } = useEditorStore.getState();
      expect(after[2].id).toBe(firstSlideId);
      expect(after[0].id).not.toBe(firstSlideId);
    });
  });

  describe("card operations", () => {
    it("should add a card to a slide", () => {
      const { addSlide, addCard } = useEditorStore.getState();

      addSlide();
      const { slides } = useEditorStore.getState();

      addCard(slides[0].id, {
        type: "text",
        content: { text: "Test content" },
        position: { x: 0, y: 0, width: 200, height: 100 },
      });

      const { slides: afterAdd } = useEditorStore.getState();
      expect(afterAdd[0].cards).toHaveLength(1);
      expect(afterAdd[0].cards[0].type).toBe("text");
    });

    it("should update a card", () => {
      const { addSlide, addCard, updateCard } = useEditorStore.getState();

      addSlide();
      const { slides } = useEditorStore.getState();

      addCard(slides[0].id, {
        type: "text",
        content: { text: "Original" },
        position: { x: 0, y: 0, width: 200, height: 100 },
      });

      const { slides: withCard } = useEditorStore.getState();
      const cardId = withCard[0].cards[0].id;

      updateCard(slides[0].id, cardId, {
        content: { text: "Updated" },
      });

      const { slides: afterUpdate } = useEditorStore.getState();
      expect(afterUpdate[0].cards[0].content).toEqual({ text: "Updated" });
    });

    it("should delete a card", () => {
      const { addSlide, addCard, deleteCard } = useEditorStore.getState();

      addSlide();
      const { slides } = useEditorStore.getState();

      addCard(slides[0].id, {
        type: "text",
        content: { text: "Test" },
        position: { x: 0, y: 0, width: 200, height: 100 },
      });

      const { slides: withCard } = useEditorStore.getState();
      const cardId = withCard[0].cards[0].id;

      deleteCard(slides[0].id, cardId);

      const { slides: afterDelete } = useEditorStore.getState();
      expect(afterDelete[0].cards).toHaveLength(0);
    });
  });

  describe("selection", () => {
    it("should select a card", () => {
      const { addSlide, addCard, selectCard } = useEditorStore.getState();

      addSlide();
      const { slides } = useEditorStore.getState();

      addCard(slides[0].id, {
        type: "text",
        content: { text: "Test" },
        position: { x: 0, y: 0, width: 200, height: 100 },
      });

      const { slides: withCard } = useEditorStore.getState();
      const cardId = withCard[0].cards[0].id;

      selectCard(cardId);

      const { selectedCardIds } = useEditorStore.getState();
      expect(selectedCardIds).toContain(cardId);
    });

    it("should clear card selection", () => {
      const { addSlide, addCard, selectCard, clearCardSelection } =
        useEditorStore.getState();

      addSlide();
      const { slides } = useEditorStore.getState();

      addCard(slides[0].id, {
        type: "text",
        content: {},
        position: { x: 0, y: 0, width: 200, height: 100 },
      });

      const { slides: withCard } = useEditorStore.getState();
      selectCard(withCard[0].cards[0].id);

      clearCardSelection();

      const { selectedCardIds } = useEditorStore.getState();
      expect(selectedCardIds).toHaveLength(0);
    });
  });

  describe("zoom", () => {
    it("should zoom in", () => {
      const { zoomIn } = useEditorStore.getState();
      const { zoom: before } = useEditorStore.getState();

      zoomIn();

      const { zoom: after } = useEditorStore.getState();
      expect(after).toBeGreaterThan(before);
    });

    it("should zoom out", () => {
      const { zoomIn, zoomOut } = useEditorStore.getState();

      // First zoom in so we can zoom out
      zoomIn();
      zoomIn();
      const { zoom: before } = useEditorStore.getState();

      zoomOut();

      const { zoom: after } = useEditorStore.getState();
      expect(after).toBeLessThan(before);
    });

    it("should reset zoom", () => {
      const { zoomIn, resetZoom } = useEditorStore.getState();

      zoomIn();
      zoomIn();

      resetZoom();

      const { zoom } = useEditorStore.getState();
      expect(zoom).toBe(1);
    });
  });

  describe("title", () => {
    it("should update the title", () => {
      const { setTitle } = useEditorStore.getState();

      setTitle("My New Presentation");

      const { title } = useEditorStore.getState();
      expect(title).toBe("My New Presentation");
    });
  });

  describe("UI state", () => {
    it("should toggle grid", () => {
      const { toggleGrid } = useEditorStore.getState();
      const { showGrid: before } = useEditorStore.getState();

      toggleGrid();

      const { showGrid: after } = useEditorStore.getState();
      expect(after).toBe(!before);
    });

    it("should toggle snap to grid", () => {
      const { toggleSnapToGrid } = useEditorStore.getState();
      const { snapToGrid: before } = useEditorStore.getState();

      toggleSnapToGrid();

      const { snapToGrid: after } = useEditorStore.getState();
      expect(after).toBe(!before);
    });

    it("should change sidebar tab", () => {
      const { setSidebarTab } = useEditorStore.getState();

      setSidebarTab("ai");

      const { sidebarTab } = useEditorStore.getState();
      expect(sidebarTab).toBe("ai");
    });
  });
});
