// Supabase Edge Function: ocr-enhance
// Dual-Engine Hybrid Fallback: Uses Gemini Flash for high-accuracy document extraction

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  evidenceId: string;
  storagePath?: string;
  imageBase64?: string;
  mimeType?: string;
  evidenceType: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: RequestPayload = await req.json();
    const { evidenceId, storagePath, imageBase64, mimeType = "image/jpeg", evidenceType } = payload;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured in Supabase Edge Secrets",
          fallbackAvailable: true,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let base64Data = imageBase64;
    let actualMimeType = mimeType;

    // If storagePath is given, download from Supabase Storage securely
    if (!base64Data && storagePath) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("asset-evidence")
        .download(storagePath);

      if (downloadError || !fileBlob) {
        return new Response(
          JSON.stringify({ error: "Could not retrieve evidence from secure storage" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      actualMimeType = fileBlob.type || "image/jpeg";
      const arrayBuffer = await fileBlob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      base64Data = btoa(binary);
    }

    if (!base64Data) {
      return new Response(
        JSON.stringify({ error: "No image content provided for enhancement" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Gemini 2.5 Flash with structured schema
    const prompt = `You are a high-accuracy document analysis system specialized in South African vehicle licensing and industrial equipment management for Senatla Ops.
Extract the structured metadata for evidence document type: "${evidenceType}".
Rules:
1. South African Licence Disc / Natis Certificate:
   - registrationNumber: format like "CA 123-456", "AB 12 CD GP"
   - vin: exactly 17 alphanumeric characters (ISO 3779 standard, never letters I, O, Q)
   - engineNumber: alphanumeric string
   - make: manufacturer (Toyota, Isuzu, Scania, Caterpillar, Komatsu, etc.)
   - model: model series (Hilux, D-Max, 320, etc.)
   - licenseExpiry: strictly YYYY-MM-DD
2. Purchase Invoices / Equipment Delivery:
   - serialNumber: equipment serial number (e.g. CAT-320-EX-0042)
   - make: manufacturer
   - model: model
3. Output strictly conforming to the requested JSON schema.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: actualMimeType,
                  data: base64Data,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              registrationNumber: { type: "STRING" },
              vin: { type: "STRING" },
              serialNumber: { type: "STRING" },
              engineNumber: { type: "STRING" },
              make: { type: "STRING" },
              model: { type: "STRING" },
              licenseExpiry: { type: "STRING" },
              confidenceScore: { type: "NUMBER" },
            },
            required: ["make"],
          },
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: "Gemini enhancement request failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiJson = await geminiResponse.json();
    const candidateText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    const extractedFields = candidateText ? JSON.parse(candidateText) : {};

    return new Response(
      JSON.stringify({
        success: true,
        evidenceId,
        enhancedBy: "gemini-2.5-flash",
        extractedFields,
        rawExtraction: candidateText,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
