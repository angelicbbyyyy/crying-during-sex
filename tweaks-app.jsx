/* ============================================================
   tweaks-app.jsx — shared Tweaks panel for every page.
   Loaded on index.html, interlude.html, chapter-2.html so the
   mood/type/intensity stay in sync across the whole experience
   (the host persists changes to the EDITMODE block in THIS file).
   ============================================================ */

const CDS_TWEAKS = /*EDITMODE-BEGIN*/{
  "mood": "warm",
  "prose": "Typewriter",
  "proseSize": 1.25,
  "grain": 0.7,
  "glitch": 0.7
}/*EDITMODE-END*/;

const PROSE_FONTS = {
  "Newsreader": '"Newsreader", Georgia, serif',
  "Spectral":   '"Spectral", Georgia, serif',
  "Typewriter": '"Special Elite", "Courier New", monospace'
};

function CDSApp() {
  const [t, setTweak] = useTweaks(CDS_TWEAKS);

  React.useEffect(() => {
    const r = document.documentElement;
    r.setAttribute("data-mood", t.mood);
    r.style.setProperty("--grain", t.grain);
    r.style.setProperty("--glitch", t.glitch);
    r.style.setProperty("--prose-size", t.proseSize + "rem");
    r.style.setProperty("--font-prose", PROSE_FONTS[t.prose] || PROSE_FONTS.Newsreader);
  }, [t.mood, t.grain, t.glitch, t.proseSize, t.prose]);

  return (
    <TweaksPanel>
      <TweakSection label="Mood" />
      <TweakRadio label="Surface" value={t.mood}
        options={["warm", "drowned"]}
        onChange={(v) => setTweak("mood", v)} />
      <TweakSection label="Type" />
      <TweakSelect label="Prose face" value={t.prose}
        options={["Newsreader", "Spectral", "Typewriter"]}
        onChange={(v) => setTweak("prose", v)} />
      <TweakSlider label="Reading size" value={t.proseSize} min={1.05} max={1.7} step={0.01} unit="rem"
        onChange={(v) => setTweak("proseSize", v)} />
      <TweakSection label="Intensity" />
      <TweakSlider label="Paper grain" value={t.grain} min={0} max={1} step={0.05}
        onChange={(v) => setTweak("grain", v)} />
      <TweakSlider label="Glitch / erosion" value={t.glitch} min={0} max={1} step={0.05}
        onChange={(v) => setTweak("glitch", v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<CDSApp />);
