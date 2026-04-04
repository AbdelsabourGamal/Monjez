
import { GoogleGenAI, Type } from "@google/genai";
import type { Jurisdiction, ComplianceCheckResult, Expense, ContractAuditResult, AITone } from '../types';

// Ensure the API key is available in the environment variables
// Always use process.env.API_KEY directly as per initialization guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const contractSystemInstruction = `You are an elite legal consultant and contract drafter. Your goal is to generate ironclad, legally binding, and precise contract clauses. 
    - You MUST adhere to the specific laws of the jurisdiction provided (e.g., Kuwait Civil Code, Saudi Commercial Court Law, UAE Federal Laws).
    - Avoid vague language. Use "Shall", "Must", and precise terms.
    - For "Credit Risk" or "Banking" clauses, ensure strict compliance with Central Bank regulations of the region.
    - If the user asks for a clause about disputes, prioritize arbitration or specific local courts.
    - Your output must be ready for professional use without basic editing.`;

const quoteSystemInstruction = `You are an AI assistant specializing in writing professional business documents. Your function is to generate clear, concise, and persuasive descriptions for items in a price quotation. The tone should be professional and marketing-oriented. Use bullet points or numbered lists for clarity where appropriate. Your response should be only the generated text based on the user's prompt and requested language, without any extra commentary.`;

// Base Legal Advisor Prompt
const getLegalAdvisorInstruction = (tone: AITone = 'formal') => {
    let toneInstruction = "";
    switch (tone) {
        case 'simplified':
            toneInstruction = "Explain concepts simply, as if explaining to a non-lawyer client. Avoid archaic Latin terms where possible.";
            break;
        case 'detailed':
            toneInstruction = "Provide exhaustive detail, covering all edge cases, exceptions, and relevant article subsections. Be academic and thorough.";
            break;
        case 'strategic':
            toneInstruction = "Focus on strategy, risk mitigation, and leverage. Think like a corporate counsel advising a CEO.";
            break;
        case 'assertive':
            toneInstruction = "Be direct, firm, and assertive. Focus on rights, demands, and strict legal boundaries. Use strong legal language to protect the client's interest.";
            break;
        case 'consultative':
            toneInstruction = "Act as a thoughtful advisor. Weigh pros and cons, offer alternatives, and guide the user towards the best course of action. Be balanced and objective.";
            break;
        case 'formal':
        default:
            toneInstruction = "Use standard, authoritative legal terminology suitable for court filings or official legal opinions.";
            break;
    }

    return `You are **QanoonAI (قانونAI)**, an elite comprehensive Legal AI Assistant for the Arab World.
- **Identity**: You are a senior jurist with encyclopedic knowledge of all legal systems in the MENA region (Kuwait, KSA, UAE, Qatar, Bahrain, Oman, Egypt, Jordan, etc.) and International Law.
- **Selected Tone**: ${toneInstruction}
- **Scope**: You assist with ALL legal fields: Commercial, Civil, Criminal, Labor, Family, Administrative, Intellectual Property, and Real Estate.
- **Capabilities**:
  1. **Precise Answers**: Cite specific Article numbers (e.g., "Article 45 of the Saudi Labor Law").
  2. **Document Analysis**: Analyze uploaded images/PDFs for legal validity, risks, and compliance.
  3. **Drafting**: Draft clauses, warnings, and official letters.
  4. **Strategic Advice**: Provide actionable legal strategy, not just theory.
- **Disclaimer**: ALWAYS end with: "This is AI-generated legal information, not professional legal advice. Please consult a licensed attorney."
- **Language**: Respond STRICTLY in the language the user speaks (Arabic or English).
`;
};

export async function generateCreativeText(prompt: string, language: 'ar' | 'en', jurisdiction?: Jurisdiction): Promise<string> {
  if (!process.env.API_KEY) {
    const demoTextAr = `[وضع تجريبي] سيقوم المساعد الذكي بتوليد نص قانوني دقيق لـ: "${prompt}" وفقاً لقوانين ${jurisdiction || 'الدولة'}.`;
    const demoTextEn = `[Demo Mode] Gemini would generate a strict legal clause for: "${prompt}" under ${jurisdiction || 'local'} law.`;
    return language === 'ar' ? demoTextAr : demoTextEn;
  }
  
  try {
    let fullPrompt: string;
    let systemInstruction: string;

    if (jurisdiction) {
      systemInstruction = contractSystemInstruction;
      const jurisdictionMap = {
          kw: 'the State of Kuwait',
          sa: 'the Kingdom of Saudi Arabia',
          ae: 'the United Arab Emirates',
          eg: 'the Arab Republic of Egypt',
          bh: 'the Kingdom of Bahrain',
          qa: 'the State of Qatar',
          intl: 'International Law'
      };
      const jurisdictionName = jurisdictionMap[jurisdiction] || 'the specified jurisdiction';

      fullPrompt = `Draft a robust legal clause or content for a contract/document.
      Jurisdiction: ${jurisdictionName}.
      User Request: "${prompt}".
      Language: ${language}.
      
      Requirements:
      1. Use formal legal terminology suitable for court proceedings.
      2. Ensure protection against ambiguity.
      3. If related to money/credit, include specific payment terms and default penalties.`;
    } else {
        systemInstruction = quoteSystemInstruction;
        fullPrompt = `Generate a creative, professional description for a business quote item based on these keywords: "${prompt}". Respond in this language: ${language}.`;
    }
    
    // Updated to recommended model gemini-3-flash-preview and removed maxOutputTokens to prevent response blocking
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: fullPrompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.5, // Lower temperature for more deterministic/legal output
        },
    });

    return response.text || "";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return language === 'ar' ? "حدث خطأ في التوليد." : "Generation error.";
  }
}

export async function getLegalAdvice(
    query: string, 
    history: {role: 'user' | 'model', parts: {text?: string, inlineData?: {mimeType: string, data: string}}[]}[] = [],
    attachment?: { mimeType: string, data: string },
    tone: AITone = 'formal',
    projectContext?: string,
    useSearch: boolean = false
): Promise<string> {
    if (!process.env.API_KEY) return "QanoonAI is not available in demo mode without API Key.";

    try {
        // Dynamic System Instruction based on Tone
        let instruction = getLegalAdvisorInstruction(tone);

        // If Project Knowledge Base exists, inject it into system instruction or as context
        if (projectContext) {
            instruction += `\n\n*** PROJECT KNOWLEDGE BASE / CONTEXT ***\nThe user has provided specific documents/context for this query. Use the following information as primary truth:\n${projectContext.substring(0, 20000)}\n*** END CONTEXT ***`;
        }

        const config: any = {
            systemInstruction: instruction,
            temperature: 0.4,
        };

        if (useSearch) {
            config.tools = [{ googleSearch: {} }];
        }

        // Using gemini-3-pro-preview for complex reasoning task as per guidelines
        const chat = ai.chats.create({
            model: 'gemini-3-pro-preview',
            config: config,
            history: history
        });

        let messageContent: any = [{ text: query }];
        
        // If there's an attachment, add it to the message parts
        if (attachment) {
            messageContent.push({
                inlineData: {
                    mimeType: attachment.mimeType,
                    data: attachment.data
                }
            });
        }

        const response = await chat.sendMessage({ message: messageContent });
        return response.text || "No response generated.";
    } catch (error) {
        console.error("Legal Advisor Error:", error);
        return "عذراً، واجهت مشكلة في الاتصال بقاعدة البيانات القانونية. يرجى المحاولة مرة أخرى.";
    }
}

export async function auditExternalContract(
    base64Data: string,
    mimeType: string,
    language: 'ar' | 'en'
): Promise<ContractAuditResult> {
    if (!process.env.API_KEY) {
        // Mock Response for Demo
        return {
            score: 72,
            risks: language === 'ar' 
                ? ['بند تجديد تلقائي دون إشعار مسبق', 'مسؤولية غير محدودة على الطرف الثاني', 'شرط جزائي مبالغ فيه عند التأخير'] 
                : ['Automatic renewal without prior notice', 'Unlimited liability for the second party', 'Excessive penalty clause for delay'],
            loopholes: language === 'ar' 
                ? ['عدم تحديد القانون الحاكم بوضوح', 'غياب بند القوة القاهرة', 'عدم ذكر آلية فضل النزاعات'] 
                : ['Governing law not clearly specified', 'Absence of Force Majeure clause', 'No dispute resolution mechanism specified'],
            summary: language === 'ar'
                ? 'العقد يبدو متوازناً بشكل عام، ولكن هناك مخاطر مالية تتعلق بالمسؤولية المفتوحة وشروط الإنهاء التي قد تكون مجحفة.'
                : 'The contract seems generally balanced, but there are financial risks related to open liability and termination conditions that may be unfair.'
        };
    }

    try {
        const prompt = `
        You are a Senior Contracts Auditor with 25+ years of experience in MENA and International Law.
        Analyze the attached contract document (image/PDF) carefully.
        
        Identify:
        1. **Dangerous Clauses**: Terms that expose the user (receiving party) to high liability, unfair penalties, or unbalanced rights.
        2. **Loopholes/Missing**: Standard protective clauses that are missing (e.g., Force Majeure, Termination Rights, Dispute Resolution, Confidentiality).
        3. **Safety Score**: A 0-100 score where 100 is perfectly safe and balanced, and 0 is extremely dangerous/illegal.
        4. **Summary**: A concise executive summary of the contract's intent and primary risk profile (max 3 sentences).

        Output STRICT JSON format:
        {
          "score": number,
          "risks": ["risk 1", "risk 2", ...],
          "loopholes": ["loophole 1", ...],
          "summary": "string"
        }
        Language: ${language} (Respond in this language)
        `;

        // Using gemini-3-pro-preview for complex vision and legal reasoning task as per guidelines
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: [
                { inlineData: { mimeType: mimeType, data: base64Data } },
                { text: prompt }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        risks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        loopholes: { type: Type.ARRAY, items: { type: Type.STRING } },
                        summary: { type: Type.STRING }
                    }
                }
            }
        });

        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);

        return {
            score: parsed.score || 0,
            risks: parsed.risks || [],
            loopholes: parsed.loopholes || [],
            summary: parsed.summary || (language === 'ar' ? 'لا يوجد ملخص' : 'No summary available')
        };

    } catch (error) {
        console.error("Contract Audit Failed:", error);
        throw new Error("Failed to audit contract.");
    }
}

export async function analyzeBankCompliance(docsContent: string, language: 'ar' | 'en'): Promise<ComplianceCheckResult> {
    if (!process.env.API_KEY) {
        // Mock response for demo
        return {
            score: 65,
            riskLevel: 'medium',
            issues: ['Missing Audit Report', 'Trade License Expiring soon'],
            recommendations: ['Renew license immediately', 'Prepare 3 years of audited financials'],
            missingDocuments: ['Audited Financials 2023', 'Valid Civil ID Copy']
        };
    }

    try {
        const prompt = `
        Act as a Senior Bank Compliance Officer. Analyze the provided list of documents or their descriptions/metadata for a corporate bank account opening or financing application.
        
        Input Data (Document Names & Content Snippets): 
        ${docsContent.substring(0, 10000)}
        
        Evaluate based on standard Central Bank standards (KYC/AML) and typical Credit requirements for the GCC region (Kuwait, Saudi, UAE).
        
        Return a JSON object with:
        - score (0-100 integer)
        - riskLevel ('low', 'medium', 'high')
        - issues (array of strings, list specific red flags like missing core docs, expired dates inferred, etc.)
        - recommendations (array of strings, actionable advice to fix issues)
        - missingDocuments (array of strings, standard documents usually required but not present in input)
        
        Output Language: ${language === 'ar' ? 'Arabic' : 'English'}
        `;

        // Using gemini-3-pro-preview for complex reasoning as per guidelines
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                        issues: { type: Type.ARRAY, items: { type: Type.STRING } },
                        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        missingDocuments: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });

        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);
        return {
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            riskLevel: parsed.riskLevel || 'high',
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            missingDocuments: Array.isArray(parsed.missingDocuments) ? parsed.missingDocuments : []
        };

    } catch (error) {
        console.error("Compliance check failed", error);
        return {
            score: 0,
            riskLevel: 'high',
            issues: ['AI Service Error'],
            recommendations: ['Try again later'],
            missingDocuments: []
        };
    }
}

export async function analyzeReceipt(base64Image: string): Promise<Partial<Expense>> {
    if (!process.env.API_KEY) throw new Error("API Key required");

    try {
        const prompt = `
        Analyze this receipt image. Extract the following details:
        1. Merchant Name (use as description).
        2. Total Amount.
        3. Date (format YYYY-MM-DD).
        4. Category (Choose strictly from: 'Office', 'Salary', 'Software', 'Marketing', 'Travel', 'Other').
        5. Currency (Detect currency code e.g. KWD, SAR, USD).

        Return JSON.
        `;

        // Using gemini-3-flash-preview for multi-modal text extraction as per guidelines
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
                { text: prompt }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        date: { type: Type.STRING },
                        category: { type: Type.STRING, enum: ['Office', 'Salary', 'Software', 'Marketing', 'Travel', 'Other'] },
                        currency: { type: Type.STRING }
                    }
                }
            }
        });

        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("Receipt analysis failed:", error);
        return {};
    }
}

export async function generateSignatureImage(name: string, language: 'ar' | 'en'): Promise<string> {
  if (!process.env.API_KEY) {
    const demoText = language === 'ar' ? `[وضع تجريبي] توقيع لـ "${name}"` : `[Demo Mode] Signature for "${name}"`;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '30px "Caveat", cursive';
        if (language === 'ar') {
           ctx.font = '30px "Tajawal", sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, canvas.width/2, canvas.height/2);
        ctx.fillText(`(${demoText})`, canvas.width/2, canvas.height/2 + 25);
    }
    return canvas.toDataURL();
  }

  try {
    const prompt = `Generate a realistic, handwritten signature image for the name "${name}". The signature should be in a professional, elegant cursive script, as if signed with a fountain pen. Use white ink on a transparent background.`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio: '16:9',
        },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating signature image:", error);
    // Fallback to canvas on error
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText("Signature Generation Failed", canvas.width/2, canvas.height/2);
    }
    return canvas.toDataURL();
  }
}

/**
 * Analyzes the company name to determine industry and creative direction.
 */
async function analyzeBrandIdentity(companyName: string, industryHint?: string): Promise<{ industry: string, symbol: string, colors: string, initials: string }> {
    try {
        const safeName = companyName.substring(0, 150);
        const hint = industryHint ? `The user specified the industry as: "${industryHint}".` : '';

        // Using gemini-3-flash-preview for text analysis as per guidelines
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze the company name "${safeName}". ${hint}
            1. Deduce the most likely Industry if not specified.
            2. Suggest a unique, strong Visual Symbol (e.g. Eagle, Pillar, Circuit, Leaf) that represents strength and this industry.
            3. Suggest a professional Color Palette (e.g. "Deep Navy and Gold", "Teal and White").
            4. Extract initials.
            
            Return JSON only: { "industry": "string", "symbol": "string", "colors": "string", "initials": "string" }`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        industry: { type: Type.STRING },
                        symbol: { type: Type.STRING },
                        colors: { type: Type.STRING },
                        initials: { type: Type.STRING }
                    }
                }
            }
        });
        
        let text = response.text || "{}";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("Brand analysis failed", e);
        return { industry: industryHint || "Business", symbol: "Abstract shape", colors: "Blue and Gray", initials: companyName.substring(0, 2) };
    }
}

export async function generateLogoImage(companyName: string, style: string = 'Modern', industry?: string): Promise<string> {
  if (!process.env.API_KEY) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 120px "Tajawal", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(companyName.substring(0,2), canvas.width / 2, canvas.height / 2);
      }
      return canvas.toDataURL();
  }

  try {
      const brandCtx = await analyzeBrandIdentity(companyName, industry);
      const stylePrompts: Record<string, string> = {
          'Modern': 'sleek, minimalist, flat vector art, clean lines, tech-forward, sans-serif typography',
          'Luxury': 'elegant, serif typography, gold metallic textures, high-end, sophisticated, fine lines',
          'Bold': 'thick lines, strong geometry, masculine, high impact, sports-style, vibrant colors',
          'Abstract': 'conceptual, geometric shapes, futuristic, gradient fills, creative negative space',
          'Classic': 'traditional, badge or emblem style, timeless, reliable, trustworthy'
      };

      const selectedStyle = stylePrompts[style] || stylePrompts['Modern'];

      const prompt = `
        Design a high-quality, professional logo for a company named "${companyName}".
        Industry: ${brandCtx.industry}.
        Concept Symbol: ${brandCtx.symbol}.
        Colors: ${brandCtx.colors}.
        Style: ${selectedStyle}.
        
        Guidelines:
        - Feature the company initials "${brandCtx.initials}" integrated with the symbol.
        - Vector art style, clean background (white).
        - No realistic photos, use graphic design illustration.
        - Distinctive, memorable, and unique identity.
      `;

      const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: prompt,
          config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
          },
      });

      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
      console.error("Error generating logo image:", error);
      throw new Error("Failed to generate logo image.");
  }
}

export async function analyzeDocument(base64Image: string): Promise<{name?: string, licenseNumber?: string, address?: string, phone?: string}> {
  if (!process.env.API_KEY) throw new Error("API Key required");

  try {
    // Using gemini-3-flash-preview for text extraction from image as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
        { text: 'Analyze this image. Extract company_name, license_number, address, phone_number in JSON.' }
      ],
    });

    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Document analysis failed:", error);
    return {};
  }
}

export async function generateEmailDraft(
  context: { clientName: string; subject: string; details: string },
  language: 'ar' | 'en',
  tone: 'formal' | 'friendly' | 'urgent'
): Promise<{ subject: string; body: string }> {
  if (!process.env.API_KEY) return { subject: context.subject, body: context.details };

  try {
    const prompt = `
      Write a professional email draft in ${language === 'ar' ? 'Arabic' : 'English'}.
      Tone: ${tone}. Client: ${context.clientName}. Subject: ${context.subject}. Details: ${context.details}.
      Return JSON: { "subject": "string", "body": "string" }
    `;

    // Using gemini-3-flash-preview and removed maxOutputTokens as per guidelines
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
            responseMimeType: "application/json", 
            responseSchema: { 
                type: Type.OBJECT, 
                properties: { 
                    subject: { type: Type.STRING }, 
                    body: { type: Type.STRING } 
                } 
            } 
        }
    });

    let text = response.text || "{}";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    return { subject: context.subject, body: context.details };
  }
}
