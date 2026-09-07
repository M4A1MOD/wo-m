const http=require('http'),fs=require('fs'),path=require('path');
const root=process.cwd();
http.createServer((req,res)=>{const p=req.url==='/'?'/outputs/智能互动教学平台-demo0.1.html':req.url; const f=path.join(root,decodeURIComponent(p)); if(fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(f));}else{res.writeHead(404);res.end('not found')}}).listen(8765,'127.0.0.1');
