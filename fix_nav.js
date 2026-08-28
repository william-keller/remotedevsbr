const fs = require('fs');
['app/auth/page.tsx', 'app/onboarding/page.tsx', 'app/recruiter/auth/page.tsx', 'app/update-password/page.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/useNavigate\(\)/g, 'useRouter()');
  c = c.replace(/const nav = /g, 'const router = ');
  c = c.replace(/const navigate = /g, 'const router = ');
  c = c.replace(/nav\(/g, 'router.push(');
  c = c.replace(/navigate\(/g, 'router.push(');
  
  // also check if useRouter is imported
  if (!c.includes('useRouter')) {
    c = c.replace(/import { usePathname } from "next\/navigation";/, 'import { usePathname, useRouter } from "next/navigation";');
  }

  fs.writeFileSync(f, c);
});
