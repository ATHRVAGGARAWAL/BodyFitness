import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

/**
 * The only file that names a typeface. Both fonts ship inside the `geist` package,
 * so builds need no network access. Swap the face by changing these two imports.
 */
export const fontVariables = `${GeistSans.variable} ${GeistMono.variable}`;
