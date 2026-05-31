declare module 'json-parse-even-better-errors' {
  export default function parseJson(
    text: string,
    reviver?: Parameters<typeof JSON.parse>[1],
    context?: number,
  ): unknown
}
