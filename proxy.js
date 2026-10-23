import { next } from '@vercel/functions';
// Vercel's explicit entrypoint accepts .js/.ts filenames.
import routing from './tools/street-routing.cjs';

export default function proxy(request) {
  const redirect=routing.streetRedirect(request.url,request.method);
  if (!redirect) return next();
  return new Response(null,{status:redirect.status,headers:{Location:redirect.location}});
}
