require("dotenv").config();

const express = require("express");
const path = require("path");
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

let userAccessTok = null;

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

//main auth stuff
app.get("/callback", async (req,res) =>{
    const code = req.query.code;

    if(!code){return res.status(400).send("No authorization code :(");}

    try {
        const clientID = process.env.HACKATIME_CLIENT_ID.trim();
        const clientSecret = process.env.HACKATIME_CLIENT_SECRET.trim();
        const redirectUri = process.env.HACKATIME_REDIRECT_URI.trim();
        
        console.log("clientid", JSON.stringify(clientID));
        console.log("clientsec", JSON.stringify(clientSecret.slice(0,4) + "..." + clientSecret.slice(-4)), "legnth:", clientSecret.legnth);
        console.log("redirURI", JSON.stringify(redirectUri), "length:", redirectUri.length);

        console.log("--- Sending these Exact values to Hackatime ---");
        console.log(`URI: "${redirectUri}`);

        const response = await fetch("https://hackatime.hackclub.com/oauth/token", {
            method:"POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code:code,
                client_id: clientID,
                client_secret: clientSecret,
                redirect_uri: redirectUri
            })
        });
        const rawResponse = await response.text();

        if(!response.ok){
            console.error("Hackatime error");
            console.error(rawResponse);
            return res.status(500).send("rejected by auth")
        }

        const data = JSON.parse(rawResponse);
        console.log("succes!")
        userAccessTok=data.access_token;
        res.redirect(`/dashboard.html#token=${encodeURIComponent(data.access_token)}`);
    } catch (error) {
        console.error("Network Erro", error);
        res.status(500).send("error");
    }
});

//time to get data
app.get("/api/stats", async (req,res) => {
    res.set("Cache-Control", "no-store");

    const authHeader = req.headers.authorization;
    const tok = authHeader?.startsWith("Bearer ") ? authHeader.slice(7):userAccessTok;

    if(!tok){return res.status(401).json({error: "no auth!"});}

    try{
        const [hoursRes, projectsRes] = await Promise.all([
            fetch("https://hackatime.hackclub.com/api/v1/authenticated/hours",{
                headers: {"Authorization": `Bearer ${userAccessTok}`}
            }),
            fetch("https://hackatime.hackclub.com/api/v1/authenticated/projects",{
                headers:{"Authorization": `Bearer ${userAccessTok}`}
            })
        ]);

        const hoursRaw = await hoursRes.text();
        const projectsRaw = await projectsRes.text();

        if(!hoursRes.ok){
            console.error("Hackatime rejected hours request:", hoursRes.status, hoursRaw);
            return res.status(500).json({error: "failed to fetch"});
        }

        let hoursData;
        let projectsData;

        try{
            hoursData = JSON.parse(hoursRaw);
            projectsData = projectsRes.ok ? JSON.parse(projectsRaw) : {projects: []};
        }catch(parseErr){
            console.error("failed to parse", parseErr);
            return res.status(500).json({error:"invalid"});
        }

        const totalSeconds = hoursData.total_seconds || 0;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        res.json({
            total_hours: `${hours}h ${minutes}m`,
            total_seconds: totalSeconds,
            projects: projectsData.projects || []
        })

        
    } catch(error){
        console.error("stats: route failed:", error);
        res.status(500).json({error: "internal server error fetchhing metrics"});
    }
});

if(require.main === module){
    app.listen(PORT, ()=>{
        console.log("Server running bud!");
    })
}

module.exports = app;