import { DocumentModel, scanDocument } from './scanner';
import { SymbolTable, collectSymbols } from './symbols';

export interface AsciiDocModel {
  document: DocumentModel;
  symbols: SymbolTable;
}

export function buildModel(text: string): AsciiDocModel {
  const document = scanDocument(text);
  return { document, symbols: collectSymbols(document) };
}
