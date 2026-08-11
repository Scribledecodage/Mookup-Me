import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const mistral = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY || 'dummy_key',
  baseURL: "https://api.mistral.ai/v1",
});

export async function POST(req: Request) {
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json(
      { error: "Mistral API Key non configurée dans Vercel." },
      { status: 500 }
    );
  }
  try {
    const { message, imageUrl } = await req.json();

    if (!message && !imageUrl) {
      return NextResponse.json({ error: "Message or Image is required" }, { status: 400 });
    }

    // Ajout de la date actuelle au système pour que l'IA soit à jour
    const currentDate = new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const messages: any[] = [
      {
        role: 'system',
        content: `Tu es BDD Bot, l'assistant IA intégré à Mookup. Tu es propulsé par Mistral IA.

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
    const modelToUse = imageUrl ? 'pixtral-12b-latest' : 'mistral-small-latest';

    const chatCompletion = await mistral.chat.completions.create({
      messages,
      model: modelToUse,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Mistral API Error:', error);
    return NextResponse.json(
      { error: "Erreur lors de la communication avec l'IA", details: error.message },
      { status: 500 }
    );
  }
}
