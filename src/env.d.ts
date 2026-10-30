declare module 'piexifjs' {
  const piexif: {
    load(data: string): Record<string, any>;
    dump(obj: Record<string, any>): string;
    insert(exif: string, jpeg: string): string;
    remove(jpeg: string): string;
  };
  export default piexif;
}
