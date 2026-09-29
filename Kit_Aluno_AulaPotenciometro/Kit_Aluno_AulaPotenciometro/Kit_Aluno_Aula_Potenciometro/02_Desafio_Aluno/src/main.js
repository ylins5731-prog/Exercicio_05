const valor=document.getElementById("valor"),faixa=document.getElementById("faixa"),log=document.getElementById("log");
const botao=document.getElementById("conectar");
let porta=null,reader=null,tarefaLeitura=null,abrindo=false;
function mostrar(raw){
  const pct=raw/1023*100;
  valor.textContent=`${pct.toFixed(1).replace(".",",")} %`;
  // DESAFIO 1: cole aqui o bloco que classifica BAIXA, MÉDIA ou ALTA.
  // DESAFIO 2: cole aqui o bloco que ativa o alarme em 80%.
}
function estado(conectado){
  botao.textContent=conectado?"DESCONECTAR":"CONECTAR ARDUINO";
  log.textContent=conectado?"Conectado. Movimente o potenciômetro.":"Aguardando conexão.";
}

async function lerArduino(){
  const decoder=new TextDecoder();let buffer="";
  try{
    reader=porta.readable.getReader();
    while(true){
      const {value,done}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const linhas=buffer.split(/\r?\n/);buffer=linhas.pop()??"";
      for(const linha of linhas){
        if(linha.startsWith("POT:")){
          const n=Number(linha.slice(4));
          if(Number.isInteger(n)&&n>=0&&n<=1023)mostrar(n);
        }
      }
    }
  }finally{
    if(reader){reader.releaseLock();reader=null;}
  }
}

async function desconectar(){
  try{
    if(reader)await reader.cancel();
    if(tarefaLeitura)await tarefaLeitura;
    if(porta?.readable||porta?.writable)await porta.close();
    log.textContent="Porta serial liberada.";
  }catch(e){log.textContent=`Falha ao liberar a porta: ${e.message}`;}
  finally{porta=null;tarefaLeitura=null;estado(false);}
}

botao.onclick=async()=>{
  if(!navigator.serial){log.textContent="Use Chrome ou Edge.";return;}
  if(porta?.readable){await desconectar();return;}
  if(abrindo)return;
  abrindo=true;botao.disabled=true;
  try{
    porta=await navigator.serial.requestPort();
    if(!porta.readable)await porta.open({baudRate:9600});
    estado(true);
    tarefaLeitura=lerArduino();
  }catch(e){
    porta=null;estado(false);
    const ocupada=String(e.message).toLowerCase().includes("already open");
    log.textContent=ocupada
      ?"Porta ocupada. Feche a solução do professor e outras abas da aula, reconecte o USB e tente novamente."
      :`Falha: ${e.message}`;
  }finally{abrindo=false;botao.disabled=false;}
};

addEventListener("beforeunload",()=>{if(reader)reader.cancel();});
