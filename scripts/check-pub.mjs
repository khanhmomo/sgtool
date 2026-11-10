import { readFileSync } from "fs";
import mongoose from "mongoose";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^"|"$/g,"")]}));
const c = await mongoose.connect(env.MONGODB_URI);
const evs = await c.connection.db.collection("events").find({}, {projection:{name:1,tacticPublished:1,tacticDays:1,hyrox:1,type:1,shareSlug:1}}).toArray();
for (const e of evs) {
  const td = (e.tacticDays||[]).map(d=>`${d.date}:${d.published}`);
  const hx = (e.hyrox||[]).map(d=>`${d.date}:${d.published}`);
  if (e.tacticPublished || td.length || hx.length)
    console.log(e.shareSlug, "|", e.name, "| type:", e.type, "| tacticPublished:", e.tacticPublished, "| tacticDays:", td.join(","), "| hyrox:", hx.join(","));
}
console.log("--- done", evs.length, "events");
await mongoose.disconnect();
