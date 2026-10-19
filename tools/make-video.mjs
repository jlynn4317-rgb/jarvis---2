// Makes a vertical (1080x1920) text-slide video for TikTok / Reels / Shorts from a small JSON file.
// Runs on your own computer (it needs FFmpeg), not on the website.
//
//   node tools/make-video.mjs slides.json out.mp4
//
// slides.json: { "footer": "gblabs.app/gifts", "slides": [ { "text": "Gift ideas", "seconds": 2.5 }, ... ] }
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , slidesPath, outPath] = process.argv;
if (!slidesPath || !outPath) {
  console.error("Usage: node tools/make-video.mjs slides.json out.mp4");
  process.exit(1);
}

const findFfmpeg = () => {
  if (process.env.FFMPEG && existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (probe.status === 0) return "ffmpeg";
  const winget = join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
  if (existsSync(winget)) {
    for (const pkg of readdirSync(winget).filter((name) => name.startsWith("Gyan.FFmpeg"))) {
      const root = join(winget, pkg);
      for (const build of readdirSync(root)) {
        const candidate = join(root, build, "bin", "ffmpeg.exe");
        if (existsSync(candidate)) return candidate;
      }
    }
  }
  console.error("FFmpeg not found. Install it with: winget install Gyan.FFmpeg");
  process.exit(1);
};

const FONT = existsSync("C:/Windows/Fonts/seguibl.ttf") ? "C:/Windows/Fonts/seguibl.ttf" : "C:/Windows/Fonts/arialbd.ttf";
const ffmpeg = findFfmpeg();
const config = JSON.parse(readFileSync(slidesPath, "utf8"));
const slides = config.slides;
const footer = config.footer || "";

const escapePath = (path) => path.replace(/\\/g, "/").replace(/:/g, "\\:");
const wrap = (text, width = 17) => {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    if ((line + " " + word).trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
};

const work = mkdtempSync(join(tmpdir(), "gb-video-"));
const clips = [];

slides.forEach((slide, index) => {
  const seconds = Number(slide.seconds) || 2.5;
  const textFile = join(work, `slide${index}.txt`);
  const footerFile = join(work, `footer.txt`);
  writeFileSync(textFile, wrap(slide.text), "utf8");
  writeFileSync(footerFile, footer, "utf8");

  const fade = `alpha='if(lt(t,0.3),t/0.3,if(gt(t,${seconds - 0.3}),(${seconds}-t)/0.3,1))'`;
  const isHook = index === 0;
  const filters = [
    `drawbox=x=0:y=ih-28:w=iw:h=28:color=0xb7ff38:t=fill`,
    `drawtext=fontfile='${escapePath(FONT)}':textfile='${escapePath(textFile)}':fontsize=${isHook ? 104 : 96}:fontcolor=${isHook ? "0xb7ff38" : "white"}:line_spacing=22:text_align=center:x=(w-text_w)/2:y=(h-text_h)/2:${fade}`,
  ];
  if (footer) filters.push(`drawtext=fontfile='${escapePath(FONT)}':textfile='${escapePath(footerFile)}':fontsize=44:fontcolor=0x8f99a5:x=(w-text_w)/2:y=h-170`);

  const clip = join(work, `clip${index}.mp4`);
  const result = spawnSync(ffmpeg, ["-y", "-f", "lavfi", "-i", `color=c=0x050608:s=1080x1920:r=30:d=${seconds}`, "-vf", filters.join(","), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", clip], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stderr.split("\n").slice(-12).join("\n"));
    process.exit(1);
  }
  clips.push(clip);
});

const listFile = join(work, "list.txt");
writeFileSync(listFile, clips.map((clip) => `file '${clip.replace(/\\/g, "/")}'`).join("\n"), "utf8");
mkdirSync(join(outPath, ".."), { recursive: true });

const joined = spawnSync(ffmpeg, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "-movflags", "+faststart", outPath], { encoding: "utf8" });
if (joined.status !== 0) {
  console.error(joined.stderr.split("\n").slice(-12).join("\n"));
  process.exit(1);
}
console.log(`Made ${outPath} (${slides.reduce((sum, slide) => sum + (Number(slide.seconds) || 2.5), 0)}s, ${slides.length} slides)`);
