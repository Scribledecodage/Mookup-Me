import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const mistral = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY || 'dummy_key',
  baseURL: "https://api.mistral.ai/v1",
});

const cleanImageAnalysisResponse = (value: string) => value
  .replace(/[\r\n]+/g, ' ')
  .replace(/[^\p{L}\p{N}\s,.]/gu, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

export async function POST(req: Request) {
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      { error: "Mistral API Key non configurée dans Vercel." },
      { status: 500 }
    );
  }
  try {
    const { message, imageUrl, systemPrompt, botName, model, imageAnalysis } = await req.json();

    if (!message && !imageUrl) {
      return NextResponse.json({ error: "Message or Image is required" }, { status: 400 });
    }

    // Ajout de la date actuelle au système pour que l'IA soit à jour
    const currentDate = new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const customSystemPrompt = typeof systemPrompt === 'string' && systemPrompt.trim()
      ? `Tu es ${typeof botName === 'string' && botName.trim() ? botName.trim() : 'un assistant personnalisé'} intégré à Mookup.\n\nDate du jour : ${currentDate}\n\nRéponds en français sauf si l’utilisateur écrit dans une autre langue. Sois naturel, utile et concis.\n\nInstructions de fonctionnement :\n${systemPrompt.trim()}`
      : '';

    const imageAnalysisPrompt = imageAnalysis === true && imageUrl
      ? `Tu es le module d’analyse d’image de BDD Bot dans une fenêtre d’analyse. Tu n’es pas un assistant de messagerie.

Donne uniquement le résultat de l’analyse demandée. Ne commence pas par une salutation, une formule de politesse ou une présentation. Ne termine pas par une question ou une invitation.

Réponds en français dans un seul bloc de texte court et clair. N’utilise pas de markdown, de listes, de titres, de puces, d’emojis, d’icônes, d’astérisques, de dièses, de tirets, de guillemets décoratifs, de parenthèses, de crochets, de liens ou de symboles décoratifs. Utilise uniquement des phrases normales avec des lettres, des chiffres, des espaces, des virgules et des points. Les accents français sont autorisés.

Analyse uniquement ce qui est visible dans l’image. Si un détail est illisible ou incertain, indique-le simplement. N’invente aucune information.`
      : '';

    const messages: any[] = [
      {
        role: 'system',
        content: imageAnalysisPrompt || customSystemPrompt || `Tu es BDD Bot, l'assistant IA intégré à Mookup. Tu es propulsé par Mistral IA.

Date du jour : ${currentDate}

## Contexte de conversation
- Tu échanges avec l'utilisateur dans une discussion privée, comme dans une messagerie instantanée.
- Réponds toujours en français, sauf si l'utilisateur écrit dans une autre langue.
- Adopte un ton naturel, chaleureux et direct, comme dans un message privé.

## Style des réponses
- Fais des réponses courtes : en général une à trois phrases, et va directement à l'essentiel.
- N'utilise jamais de puces, de listes numérotées, de titres, de tableaux, de séparateurs ou de sections.
- Écris sous forme de courts paragraphes naturels. Pour énumérer plusieurs éléments, utilise une phrase avec des virgules plutôt qu'une liste.
- Ne te présente pas à chaque message — uniquement si l'utilisateur te le demande.
- Si la question est complexe, reste bref et donne l'essentiel ; développe seulement si l'utilisateur le demande.
- Utilise un bloc de code uniquement si c'est indispensable pour répondre, sans ajouter de liste ni de titre.

## Capacités
- Tu peux analyser des images : si une image est envoyée seule, décris-la et propose une analyse. Si elle accompagne un message, utilise-la comme contexte pour répondre à la demande.
- Tu peux aider sur tous les sujets : code, rédaction, analyse, mathématiques, culture générale, etc.

## Limites
- Si tu ne sais pas quelque chose avec certitude, dis-le clairement plutôt que d'inventer.
- Tu n'as pas accès à internet en temps réel — pour les informations très récentes, signale que ta connaissance a une date limite.`
      }
    ];

    const userContent: any[] = [];
    
    if (message) {
      userContent.push({ type: "text", text: message });
    }
    
    if (imageUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    }

    messages.push({ role: 'user', content: userContent });

    // Choix du modèle : Pixtral latest si il y a une image, Mistral Small latest sinon
    const allowedModels = ['mistral-large-latest', 'mistral-small-latest'];
    const modelToUse = imageUrl
      ? 'pixtral-12b-latest'
      : (typeof model === 'string' && allowedModels.includes(model) ? model : 'mistral-small-latest');

    const chatCompletion = await mistral.chat.completions.create({
      messages,
      model: modelToUse,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";
    const finalResponse = imageAnalysis === true && imageUrl
      ? cleanImageAnalysisResponse(responseText)
      : responseText;

    return NextResponse.json({ response: finalResponse });
  } catch (error: any) {
    console.error('Mistral API Error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la communication avec l'IA", details: error.message },
      { status: 500 }
    );
  }
}
