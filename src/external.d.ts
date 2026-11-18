declare module 'upng-js' {
  const UPNG: {
    encode: (
      imgs: ArrayBuffer[],
      w: number,
      h: number,
      cnum: number,
      dels?: number[]
    ) => ArrayBuffer;
    decode: (buff: ArrayBuffer) => {
      width: number;
      height: number;
      data: Uint8Array;
    };
    toRGBA8: (out: unknown) => ArrayBuffer[];
  };
  export default UPNG;
  export const encode: typeof UPNG.encode;
  export const decode: typeof UPNG.decode;
  export const toRGBA8: typeof UPNG.toRGBA8;
}
