declare module 'pdfmake/build/pdfmake' {
  const pdfMake: any;
  export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake: {
      vfs: any;
    };
  };
  export = pdfFonts;
}

declare module 'pdfmake/interfaces' {
  export interface TDocumentDefinitions {
    content: any[];
    styles?: Record<string, any>;
    defaultStyle?: Record<string, any>;
    [key: string]: any;
  }
}