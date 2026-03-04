import { BlockInstance, FormDocument, FormPage } from "@otl-core/cms-types";

export function getPreviousPage(
  currentPage: FormPage,
  formDocument: FormDocument,
) {
  const index = formDocument.pages.findIndex(
    (page) => page.id === currentPage.id,
  );
  if (index === 0) {
    return null;
  }
  return formDocument.pages[index - 1];
}

export function getNextPage(currentPage: FormPage, formDocument: FormDocument) {
  const index = formDocument.pages.findIndex(
    (page) => page.id === currentPage.id,
  );
  if (index === formDocument.pages.length - 1) {
    return null;
  }
  return formDocument.pages[index + 1];
}

export function findBlockInDocument(
  blockId: string,
  document: FormDocument,
): BlockInstance | null {
  for (const page of document.pages) {
    const block = findBlockRecursive(blockId, page.blocks);
    if (block) return block;
  }
  return null;
}

function findBlockRecursive(
  blockId: string,
  blocks: BlockInstance[],
): BlockInstance | null {
  for (const block of blocks) {
    if (block.id === blockId) {
      return block;
    }

    // Check nested blocks (e.g., in form-inline-group)
    if (block.config.blocks && Array.isArray(block.config.blocks)) {
      const nestedBlocks = block.config.blocks.map(
        (b) =>
          ({
            id: b.id,
            type: b.type,
            config: b.config || {},
          }) as BlockInstance,
      );

      const found = findBlockRecursive(blockId, nestedBlocks);
      if (found) return found;
    }
  }

  return null;
}
