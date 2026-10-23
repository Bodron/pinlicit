import { proxyPublic } from "@/lib/api-proxy";
export async function GET() {
  return proxyPublic("categories");
}
