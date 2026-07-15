async function getHackatimeStats() {
    const storedToken = localStorage.getItem("hackatimetok");
    const res = await fetch("/api/stats", {
        cache: "no-store",
        headers: storedToken ? {"Authorization": `Bearer ${storedToken}`} : {}
    });
    if(!res.ok) throw new Error("Couldn't load stats");
    return await res.json();
}