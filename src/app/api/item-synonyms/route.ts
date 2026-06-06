import { NextResponse } from "next/server";
import { getAllItemPhotoSynonyms } from "@/lib/venue-synonyms";

export async function GET() {
  return NextResponse.json(getAllItemPhotoSynonyms());
}
