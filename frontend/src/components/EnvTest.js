import { useEffect } from 'react'; export default function Test() { useEffect(() => { console.log('NEXT_PUBLIC_FACTORY_ADDRESS:', process.env.NEXT_PUBLIC_FACTORY_ADDRESS); }, []); return null; }
