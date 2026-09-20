export const config = { runtime: "edge" };

export default async function handler(req)
{
	if (req.method === "OPTIONS")
	{
        return new Response(null,
			{
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
        			"Access-Control-Allow-Headers": "Content-Type"
				}
			}
		);
	}

	if (req.method !== "POST")
	{
		return new Response(JSON.stringify({ message: "Method not allowed" }), {
			status: 405,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		});
	}

	let body;

	try {
		body = await req.json();
	} catch (error) {
		return new Response(JSON.stringify({ message: "Invalid JSON" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		});
	}

	const { code, redirect_uri } = body;

	if (!code || !redirect_uri)
	{
		return new Response(JSON.stringify({ message: "Missing code or redirect_uri" }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type"
			}
		});
	}

	const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			grant_type: "authorization_code",
			client_id: process.env.FT_CLIENT_ID,
			client_secret: process.env.FT_CLIENT_SECRET,
			code,
			redirect_uri
		})
	});

	const data = await tokenRes.json();

	return new Response(JSON.stringify(data), {
		status: tokenRes.status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type"
		}
	});
}