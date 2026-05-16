export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/hr/:path*", "/employee/:path*"],
};
