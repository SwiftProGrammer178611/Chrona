async function getHackatimeStats(){ 
    const res = await fetch("/api/stats", {cache:"no-store"});
    if(!res.ok) throw new Error("Couldn't load stats");
    return await res.json();
}