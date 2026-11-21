

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Vérification de la clé côté serveur
    if (!env.GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY manquante dans l'environnement." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupération des données envoyées par le front-end
    const { messages, jsonMode = true } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Le champ 'messages' (tableau) est requis." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Construction du payload pour Groq
    const payload = {
      model: "openai/gpt-oss-120b",
      messages,
      temperature: 0.3,
    };

    // Activation du mode JSON strict (attention : Groq exige le mot "JSON" dans le prompt si activé)
    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Erreur API Groq", details: data }),
        { status: groqResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // On renvoie directement le contenu généré par l'IA
    const content = data.choices[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ result: content }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur interne du relais /api/chat", message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}