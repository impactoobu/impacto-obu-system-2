import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, collection, addDoc,
  query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmJ_fu33l0mcnezjpFXAaj3paGZLM5TFM",
  authDomain: "impacto-obu-system.firebaseapp.com",
  projectId: "impacto-obu-system",
  storageBucket: "impacto-obu-system.firebasestorage.app",
  messagingSenderId: "213609724304",
  appId: "1:213609724304:web:e68f7883294bd6cffedb15"
};

const academyId="impacto-obu";
const $=id=>document.getElementById(id);
let students=[];

function log(msg,data){$("diagnosticLog").textContent=`${msg}\n${data?JSON.stringify(data,null,2):""}\n\n`+$("diagnosticLog").textContent}
function toast(msg){$("toast").textContent=msg;$("toast").hidden=false;setTimeout(()=>$("toast").hidden=true,3000)}
function friendly(error){
  const map={
    "auth/email-already-in-use":"Este e-mail já está cadastrado.",
    "auth/invalid-email":"E-mail inválido.",
    "auth/weak-password":"A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-credential":"E-mail ou senha incorretos.",
    "auth/unauthorized-domain":"Domínio não autorizado no Firebase."
  };
  return map[error?.code]||`${error?.code||"erro"}: ${error?.message||"Falha desconhecida"}`;
}

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);
$("statusText").textContent="Firebase conectado. Pronto para usar.";

$("toggleRegister").onclick=()=>$("registerForm").hidden=!$("registerForm").hidden;

$("registerForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const name=$("registerName").value.trim();
    const credential=await createUserWithEmailAndPassword(auth,$("registerEmail").value.trim(),$("registerPassword").value);
    await updateProfile(credential.user,{displayName:name});
    await setDoc(doc(db,"users",credential.user.uid),{
      academyId,name,email:credential.user.email,role:"admin",active:true,createdAt:serverTimestamp()
    },{merge:true});
    toast("Administrador criado com sucesso.");
  }catch(error){toast(friendly(error));log("ERRO NO CADASTRO",{code:error.code,message:error.message})}
};

$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  try{await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value)}
  catch(error){toast(friendly(error));log("ERRO NO LOGIN",{code:error.code,message:error.message})}
};

$("forgotButton").onclick=async()=>{
  const email=$("loginEmail").value.trim();
  if(!email)return toast("Digite seu e-mail.");
  try{await sendPasswordResetEmail(auth,email);toast("E-mail de recuperação enviado.")}
  catch(error){toast(friendly(error))}
};

$("logoutButton").onclick=()=>signOut(auth);

onAuthStateChanged(auth,user=>{
  $("authView").hidden=!!user;
  $("appView").hidden=!user;
  if(!user)return;
  $("userLabel").textContent=user.displayName||user.email;
  $("welcomeText").textContent=`Olá, ${(user.displayName||"Igor").split(" ")[0]} 👋`;
  const q=query(collection(db,"students"),where("academyId","==",academyId));
  onSnapshot(q,snap=>{
    students=snap.docs.map(d=>({id:d.id,...d.data()}));
    renderStudents();
  },error=>{toast("Erro ao carregar alunos.");log("ERRO FIRESTORE",{code:error.code,message:error.message})})
});

function renderStudents(){
  const term=$("searchInput").value.toLowerCase();
  const filtered=students.filter(s=>`${s.fullName||""} ${s.nameJa||""}`.toLowerCase().includes(term));
  $("studentCount").textContent=filtered.length;
  $("studentList").innerHTML=filtered.length?filtered.map(s=>`
    <article class="student-card">
      <strong>${s.fullName}</strong>
      <div>${s.nameJa||""} • ${s.category||""} • ${s.belt||""}</div>
      <small>QR: ${s.registrationNumber||""}</small>
    </article>`).join(""):"<p>Nenhum aluno cadastrado.</p>";
}

$("searchInput").oninput=renderStudents;
$("openStudentButton").onclick=()=>$("studentDialog").showModal();
$("closeStudentButton").onclick=()=>$("studentDialog").close();

$("studentForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    const registrationNumber=`OBU-${Date.now().toString().slice(-7)}`;
    await addDoc(collection(db,"students"),{
      academyId,registrationNumber,
      fullName:$("studentName").value.trim(),
      nameJa:$("studentNameJa").value.trim(),
      category:$("studentClass").value,
      belt:$("studentBelt").value,
      monthlyFee:Number($("studentFee").value||0),
      dueDay:10,active:true,paidCurrentMonth:false,
      createdBy:auth.currentUser.uid,createdAt:serverTimestamp()
    });
    $("studentDialog").close();
    $("studentForm").reset();
    $("studentFee").value="8800";
    toast("Aluno cadastrado.");
  }catch(error){toast(friendly(error));log("ERRO AO SALVAR ALUNO",{code:error.code,message:error.message})}
};
