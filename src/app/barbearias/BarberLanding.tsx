"use client";

import Image from "next/image";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Check, MessageCircle, Scissors, ShieldCheck, UsersRound, Zap } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./BarberLanding.module.css";

const message = "/whatsapp?source=barbearias&intent=whatsapp_contact&text=Ol%C3%A1!%20Quero%20conhecer%20a%20Lexon%20Agenda%20para%20minha%20barbearia.";
const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function BarberLanding() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image src="/landing/barbearias-hero-editorial.png" alt="Barbeiro consultando agenda pelo celular na barbearia" fill priority sizes="100vw" className={styles.heroImage} />
        <div className={styles.heroOverlay} />
        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="/" className={styles.brand}><span className={styles.brandMark}>L</span>lexon<span className={styles.dot}>.</span></a>
          <a href={message} className={styles.navCta}>Falar com a Lexon <ArrowUpRight size={16} /></a>
        </nav>
        <motion.div className={styles.heroContent} initial="hidden" animate="visible" transition={{ staggerChildren: .12, delayChildren: .15 }}>
          <motion.p variants={reveal} transition={{ duration: .6 }} className={styles.eyebrow}>Agenda para barbearias</motion.p>
          <motion.h1 variants={reveal} transition={{ duration: .65 }}>Menos conversa<br />solta. <em>Mais cadeira<br />ocupada.</em></motion.h1>
          <motion.p variants={reveal} transition={{ duration: .65 }} className={styles.heroText}>Uma agenda simples para você parar de procurar horário no WhatsApp e focar no que faz a sua barbearia rodar.</motion.p>
          <motion.div variants={reveal} transition={{ duration: .65 }} className={styles.actions}>
            <a href={message} className={styles.primaryButton}>Quero para minha barbearia <ArrowUpRight size={18} /></a>
            <a href="#na-pratica" className={styles.secondaryButton}>Ver na prática <ArrowDownRight size={18} /></a>
          </motion.div>
          <motion.p variants={reveal} transition={{ duration: .65 }} className={styles.heroNote}>Primeiro mês da plataforma grátis.</motion.p>
        </motion.div>
        <div className={styles.heroFooter}><span>agenda • equipe • clientes</span><span>feito para a correria da barbearia</span></div>
      </section>

      <section className={styles.statement} id="na-pratica">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} variants={reveal} transition={{ duration: .65 }}>
          <p className={styles.kicker}>o problema não é só agenda</p>
          <h2>Quando o WhatsApp vira agenda, tudo fica na sua mão.</h2>
        </motion.div>
        <div className={styles.problemList}>
          {[
            ["Cliente perguntando horário no meio do corte.", "Você para o atendimento para achar um espaço."],
            ["Barbeiro sem saber como está o próprio dia.", "A equipe pergunta, você confere, a fila continua."],
            ["Cancelamento que ninguém viu.", "A cadeira fica vazia quando poderia estar ocupada."],
          ].map(([title, text], i) => <motion.article key={title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .35 }} variants={reveal} transition={{ duration: .5, delay: i * .08 }}><span>0{i + 1}</span><h3>{title}</h3><p>{text}</p></motion.article>)}
        </div>
      </section>

      <section className={styles.control}>
        <div className={styles.dayBoard} aria-hidden="true">
          <div className={styles.boardHead}><span>Quinta-feira</span><span>Agenda do dia</span></div>
          <div className={styles.boardRow}><b>09:00</b><span><strong>Rafael · corte</strong><small>com Lucas</small></span><i /></div>
          <div className={styles.boardRow}><b>10:00</b><span><strong>Gustavo · barba e corte</strong><small>com André</small></span><i /></div>
          <div className={`${styles.boardRow} ${styles.openRow}`}><b>11:30</b><span>Horário aberto</span></div>
          <div className={styles.boardTag}><Check size={15} /> Cliente confirmado</div>
        </div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .35 }} variants={reveal} transition={{ duration: .65 }}>
          <p className={styles.kicker}>visão de jogo</p>
          <h2>Você vê a operação.<br /><em>A equipe vê o próprio corre.</em></h2>
          <p className={styles.controlText}>A Lexon coloca horários, serviços e profissionais no mesmo lugar. Cada barbeiro acompanha a sua agenda e você mantém o controle do dia sem ficar centralizando conversa.</p>
          <ul>
            <li><Check size={17} /> Agenda por profissional e serviço</li>
            <li><Check size={17} /> Página para o cliente marcar sozinho</li>
            <li><Check size={17} /> Histórico de clientes sempre à mão</li>
          </ul>
        </motion.div>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresHeader}><p className={styles.kicker}>o básico, bem resolvido</p><h2>Menos ajuste manual.<br />Mais barber shop.</h2></div>
        <div className={styles.featureGrid}>
          <article><CalendarClock size={25} /><h3>Agenda limpa</h3><p>Bata o olho e entenda quem atende, qual serviço vem agora e onde cabe mais um cliente.</p></article>
          <article><UsersRound size={25} /><h3>Equipe alinhada</h3><p>Cada profissional acompanha os seus horários sem depender de você para tudo.</p></article>
          <article><Scissors size={25} /><h3>Marca com atitude</h3><p>Uma página de agendamento com a cara da sua barbearia, pronta para compartilhar.</p></article>
        </div>
      </section>

      <section className={styles.whatsapp}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: .3 }} variants={reveal} transition={{ duration: .65 }}>
          <p className={styles.kicker}>whatsapp, quando fizer sentido</p>
          <h2>Automação não é obrigação. <em>É reforço.</em></h2>
          <p>Quando a operação pedir, você pode adicionar automação por WhatsApp para trabalhar com confirmações, lembretes e reativação. É um serviço com taxa extra, combinada antes da ativação.</p>
          <a href={message} className={styles.borderButton}>Entender a automação <ArrowUpRight size={18} /></a>
        </motion.div>
        <div className={styles.chat} aria-hidden="true"><MessageCircle size={20} /><p>Fala, Rafael. Seu horário está confirmado para hoje.</p><span>Mensagem da barbearia</span></div>
      </section>

      <section className={styles.pricing} id="planos">
        <div className={styles.pricingHeader}><p className={styles.kicker}>sem enrolação</p><h2>Planos claros. Escolha o seu.</h2></div>
        <div className={styles.plans}>
          <article className={styles.plan}><Zap size={21} /><h3>Agenda</h3><p className={styles.planLead}>Para botar ordem na agenda.</p><p className={styles.price}>R$ 59 <small>/mês</small></p><span className={styles.free}>Primeiro mês da plataforma grátis</span><a href={message}>Quero começar <ArrowUpRight size={16} /></a><ul><li><Check size={15} /> 1 profissional</li><li><Check size={15} /> Agenda e agendamento online</li><li><Check size={15} /> Serviços e clientes</li></ul></article>
          <article className={`${styles.plan} ${styles.planMain}`}><span className={styles.best}>mais flexível</span><ShieldCheck size={21} /><h3>Profissional</h3><p className={styles.planLead}>Para rodar a operação com mais recurso.</p><p className={styles.price}>R$ 89 <small>/mês</small></p><span className={styles.free}>Primeiro mês da plataforma grátis</span><a href={message}>Quero começar <ArrowUpRight size={16} /></a><ul><li><Check size={15} /> Até 3 profissionais</li><li><Check size={15} /> Identidade da barbearia</li><li><Check size={15} /> CRM e financeiro</li><li><Check size={15} /> Automação disponível com taxa extra</li></ul></article>
          <article className={`${styles.plan} ${styles.planMeta}`}><span className={styles.meta}>API oficial Meta</span><MessageCircle size={21} /><h3>Automação</h3><p className={styles.planLead}>Para pôr o WhatsApp na operação.</p><p className={styles.price}>R$ 169 <small>/mês</small></p><span className={styles.blank} /><a href={message}>Falar sobre o plano <ArrowUpRight size={16} /></a><ul><li><Check size={15} /> Até 6 profissionais</li><li><Check size={15} /> Automação por WhatsApp inclusa</li><li><Check size={15} /> Confirmações e lembretes</li><li className={styles.official}><Check size={15} /> Opção de conexão pela API oficial da Meta</li></ul></article>
        </div>
        <p className={styles.planNote}>A automação é cobrada quando for contratada. No plano Automação, ela já está na mensalidade. Conversas e templates da Meta são cobrados diretamente pela Meta.</p>
      </section>

      <section className={styles.final}><p className={styles.kicker}>sua barbearia no comando</p><h2>Deixa a agenda<br />trabalhar <em>do seu lado.</em></h2><a href={message} className={styles.primaryButton}>Quero organizar minha barbearia <ArrowUpRight size={18} /></a><p>O primeiro mês da plataforma é grátis para você conhecer.</p></section>
      <footer className={styles.footer}><a href="/" className={styles.brand}><span className={styles.brandMark}>L</span>lexon<span className={styles.dot}>.</span></a><span>Agenda feita para a rotina da barbearia.</span><span>© {new Date().getFullYear()} Lexon Agenda</span></footer>
    </main>
  );
}
