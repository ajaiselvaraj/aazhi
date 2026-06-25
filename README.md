# Aria Voice Assistant — Next.js Integration

Converted from a standalone HTML/JS artifact into a production-ready
React/Next.js component. Verified with `tsc --noEmit`, `next build`, and
`eslint` against a real Next.js 16 (App Router) project.

## Files

```
app/api/aria/route.ts        Server-side API route (keeps your Anthropic key secret)
components/AriaAssistant.tsx Client component — UI, mic, speech synthesis
hooks/useVoiceAssistant.ts   Speech recognition/synthesis logic, isolated from UI
```

## Setup

1. **Copy the files** into the matching paths in your Next.js project
   (adjust if you don't use the `app/` router or the `@/*` import alias).

2. **Install the icon library:**
   ```bash
   npm install lucide-react
   ```

3. **Add your API key** to `.env.local` (never commit this file):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

4. **Render the component** anywhere in your app:
   ```tsx
   import AriaAssistant from "@/components/AriaAssistant";

   export default function Page() {
     return <AriaAssistant />;
   }
   ```

5. Tailwind must already be configured in your project (it was generated
   assuming Tailwind v4 / the default `create-next-app` setup).

## What changed from the original HTML artifact

- **Security**: the API key no longer lives in client-side JS. The browser
  calls `/api/aria`, and only the server route talks to Anthropic.
- **Validation**: the API route rejects malformed or oversized message
  histories (max 20 messages, 4000 chars each) before forwarding to Claude.
- **Architecture**: speech recognition/synthesis logic is isolated in
  `useVoiceAssistant.ts` so it can be tested or reused independently of the UI.
- **Styling**: rebuilt with Tailwind utility classes; the few keyframes
  Tailwind doesn't ship by default (orb rings, waveform, typing dots) are
  defined in a small `<style jsx global>` block.
- **Icons**: swapped Tabler's icon font for `lucide-react`, so no extra
  `<link>` tag or CDN dependency is needed.
- **Lifecycle safety**: the hook tracks mount state so async callbacks
  (speech recognition results, `fetch` responses) never set state after
  the component unmounts.
- **Error handling**: a visible banner now appears if the API call fails,
  in addition to the spoken fallback message.
- **Markup output**: messages are HTML-escaped and only `\n` → `<br>` is
  applied (same safety behavior as the original, kept consistent with React).

## Known limitations / things to decide for your app

- The system prompt in `route.ts` is generic ("guide users through your
  app"). You'll likely want to inject context specific to **aazhi** —
  e.g. which routes exist, what each page does — either as a static prompt
  edit or by passing page context from the client into the API route.
- Speech recognition (`SpeechRecognition`/`webkitSpeechRecognition`) is
  Chrome/Edge/Safari-only; Firefox has no support. The component already
  shows a fallback warning and lets users type instead.
- No conversation persistence — history resets on page reload. If you want
  multi-session memory, you'd need to store `history` server-side or in
  local/session storage.
- No rate limiting on the API route. If this assistant is public-facing,
  consider adding a per-IP or per-session rate limit before launch.
