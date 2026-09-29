import * as BABYLON from "@babylonjs/core";

const ui = Object.fromEntries(["fonte","raw","percentual","tensao","faixa","nivel","limiar","limiarValor","conectar","demo","log"].map(id=>[id,document.getElementById(id)]));
const engine = new BABYLON.Engine(document.getElementById("renderCanvas"),true);
let porta, leitor, tarefaLeitura, demoTimer, limiar=80, conectando=false;

function mat(scene,nome,cor,emissiva=false){const m=new BABYLON.StandardMaterial(nome,scene);m.diffuseColor=BABYLON.Color3.FromHexString(cor);if(emissiva)m.emissiveColor=BABYLON.Color3.FromHexString(cor);return m}
function criarCena(){
  const scene=new BABYLON.Scene(engine);scene.clearColor=BABYLON.Color4.FromHexString("#07131dff");
  const camera=new BABYLON.ArcRotateCamera("camera",-1.2,1.12,7,new BABYLON.Vector3(0,.45,0),scene);camera.attachControl(engine.getRenderingCanvas(),true);
  new BABYLON.HemisphericLight("luz",new BABYLON.Vector3(0,1,0),scene).intensity=.95;
  const base=BABYLON.MeshBuilder.CreateCylinder("base",{diameter:3,height:.42,tessellation:64},scene);base.material=mat(scene,"baseMat","#253d4d");
  const disco=BABYLON.MeshBuilder.CreateCylinder("botao",{diameter:2.35,height:.72,tessellation:64},scene);disco.position.y=.5;disco.material=mat(scene,"botaoMat","#2f8bd0");
  const marca=BABYLON.MeshBuilder.CreateBox("marca",{width:.13,height:.12,depth:.92},scene);marca.position.set(0,.93,.5);marca.material=mat(scene,"marcaMat","#f4f8fb",true);
  const alerta=BABYLON.MeshBuilder.CreateTorus("alerta",{diameter:3.35,thickness:.13,tessellation:64},scene);alerta.rotation.x=Math.PI/2;alerta.position.y=.25;
  const normal=mat(scene,"normal","#294557"),alarme=mat(scene,"alarme","#ff4f4f",true);alerta.material=normal;
  const piso=BABYLON.MeshBuilder.CreateGround("piso",{width:11,height:8},scene);piso.position.y=-.23;piso.material=mat(scene,"pisoMat","#132938");
  return {scene,disco,marca,alerta,normal,alarme};
}
const modelo=criarCena();
function mensagem(t,c=""){ui.log.textContent=t;ui.log.className=c}
function atualizar(raw){
  raw=Math.max(0,Math.min(1023,Math.round(raw)));const pct=raw/1023*100;const v=raw/1023*5;
  ui.raw.textContent=`${raw} / 1023`;ui.percentual.textContent=`${pct.toFixed(1).replace(".",",")} %`;ui.tensao.textContent=`${v.toFixed(2).replace(".",",")} V`;ui.nivel.style.width=`${pct}%`;
  const faixa=pct<33.33?"BAIXA":pct<66.67?"MÉDIA":"ALTA";ui.faixa.textContent=pct>=limiar?`${faixa} • ALARME`:faixa;ui.faixa.className=`valor ${pct>=limiar?"erro":""}`;
  const angulo=-Math.PI*.75+(pct/100)*Math.PI*1.5;modelo.disco.rotation.y=angulo;modelo.marca.rotation.y=angulo;modelo.alerta.material=pct>=limiar?modelo.alarme:modelo.normal;
}
function processar(linha){if(linha==="PRONTO")mensagem("Arduino pronto. Movimente o potenciômetro.","ok");else if(linha.startsWith("POT:")){const n=Number(linha.slice(4));if(Number.isInteger(n)&&n>=0&&n<=1023)atualizar(n)}}
function estadoConexao(conectado){
  ui.conectar.textContent=conectado?"DESCONECTAR":"CONECTAR ARDUINO";
  ui.fonte.textContent=conectado?"ARDUINO USB":"DESCONECTADA";
  ui.fonte.className=`valor ${conectado?"ok":"alerta"}`;
}
async function ler(){
  const decoder=new TextDecoder();let buffer="";
  try{
    leitor=porta.readable.getReader();
    while(true){
      const {value,done}=await leitor.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});const linhas=buffer.split(/\r?\n/);buffer=linhas.pop()??"";
      linhas.map(x=>x.trim()).filter(Boolean).forEach(processar);
    }
  }catch(e){if(e.name!=="NetworkError")mensagem(`Comunicação interrompida: ${e.message}`,"erro")}
  finally{if(leitor){leitor.releaseLock();leitor=null}}
}
async function desconectar(){
  clearInterval(demoTimer);demoTimer=null;
  try{
    if(leitor)await leitor.cancel();
    if(tarefaLeitura)await tarefaLeitura;
    if(porta?.readable||porta?.writable)await porta.close();
  }catch(e){mensagem(`Não foi possível liberar a porta: ${e.message}`,"erro")}
  finally{porta=null;tarefaLeitura=null;estadoConexao(false)}
}
async function conectar(){
  if(!("serial" in navigator)){mensagem("Web Serial indisponível. Use Chrome ou Edge no computador.","erro");return}
  if(conectando)return;
  if(porta?.readable){await desconectar();mensagem("Porta serial liberada.","alerta");return}
  conectando=true;ui.conectar.disabled=true;clearInterval(demoTimer);demoTimer=null;
  try{
    porta=await navigator.serial.requestPort();
    if(!porta.readable)await porta.open({baudRate:9600});
    estadoConexao(true);mensagem("Porta aberta. Aguardando dados POT:...","ok");
    tarefaLeitura=ler();
  }catch(e){
    porta=null;estadoConexao(false);
    const ocupada=String(e.message).toLowerCase().includes("already open");
    mensagem(ocupada?"A porta está aberta em outra aba ou processo. Feche outras páginas desta aula, desconecte e reconecte o USB e tente novamente.":`Conexão não realizada: ${e.message}`,"erro");
  }finally{conectando=false;ui.conectar.disabled=false}
}
async function demonstrar(){
  if(porta?.readable)await desconectar();
  clearInterval(demoTimer);let valor=0,direcao=1;ui.fonte.textContent="SIMULAÇÃO";ui.fonte.className="valor alerta";mensagem("Modo demonstração ativo, sem Arduino.","alerta");
  demoTimer=setInterval(()=>{valor+=direcao*9;if(valor>=1023||valor<=0)direcao*=-1;atualizar(valor)},35);
}
ui.conectar.addEventListener("click",conectar);ui.demo.addEventListener("click",demonstrar);ui.limiar.addEventListener("input",()=>{limiar=Number(ui.limiar.value);ui.limiarValor.textContent=`${limiar} %`;const raw=Number(ui.raw.textContent.split(" ")[0]);atualizar(raw)});
atualizar(0);estadoConexao(false);engine.runRenderLoop(()=>modelo.scene.render());addEventListener("resize",()=>engine.resize());addEventListener("beforeunload",()=>{if(leitor)leitor.cancel()});
