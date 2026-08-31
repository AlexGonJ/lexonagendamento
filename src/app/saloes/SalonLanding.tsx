"use client";

import Image from "next/image";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  Crown,
  MessageCircle,
  Scissors,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import styles from "./SalonLanding.module.css";

const whatsappUrl =
  "/whatsapp?source=saloes&intent=whatsapp_contact&text=Ol%C3%A1!%20Quero%20conhecer%20a%20Lexon%20Agenda%20para%20o%20meu%20sal%C3%A3o.";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function SalonLanding() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <Image
          src="/landing/saloes-hero-editorial.png"
          alt="Dona de salão consultando a agenda pelo celular"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroShade} />

        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="/" className={styles.brand} aria-label="Lexon Agenda, início">
            <span className={styles.brandMark}>L</span>
            <span>lexon<span className={styles.brandDot}>.</span></span>
          </a>
          <a className={styles.navLink} href={whatsappUrl}>
            Falar sobre meu salão <ArrowUpRight size={16} />
          </a>
        </nav>

        <motion.div
          className={styles.heroContent}
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.12, delayChildren: 0.12 }}
        >
          <motion.p variants={reveal} transition={{ duration: 0.65 }} className={styles.eyebrow}>
            Agenda feita para salões de beleza
          </motion.p>
          <motion.h1 variants={reveal} transition={{ duration: 0.7 }}>
            O ritmo do seu salão,<br />
            <em>no lugar certo.</em>
          </motion.h1>
          <motion.p variants={reveal} transition={{ duration: 0.7 }} className={styles.heroText}>
            Organize horários, profissionais e clientes sem deixar a gestão tomar o tempo do seu atendimento.
          </motion.p>
          <motion.div variants={reveal} transition={{ duration: 0.7 }} className={styles.heroActions}>
            <a href={whatsappUrl} className={styles.primaryButton}>
              Quero conhecer para meu salão <ArrowUpRight size={18} />
            </a>
            <a href="#rotina" className={styles.textButton}>
              Ver como funciona <ArrowDownRight size={18} />
            </a>
          </motion.div>
          <motion.p variants={reveal} transition={{ duration: 0.7 }} className={styles.heroNote}>
            Comece com o primeiro mês da plataforma grátis.
          </motion.p>
        </motion.div>

        <div className={styles.heroFoot}>
          <span>feito para o seu dia a dia</span>
          <span>lexon agenda — salões</span>
        </div>
      </section>

      <section className={styles.intro} id="rotina">
        <motion.div
          className={styles.introTitle}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <p className={styles.kicker}>a rotina não para</p>
          <h2>Um salão tem muito mais acontecendo do que a agenda mostra.</h2>
        </motion.div>
        <div className={styles.painList}>
          {[
            ["O encaixe entre uma cor e uma escova.", "Aquele horário que só uma cliente costuma pedir."],
            ["Cada profissional com a própria rotina.", "E você precisando enxergar o dia inteiro."],
            ["O atendimento acontecendo agora.", "Enquanto a próxima conversa já chega no WhatsApp."],
          ].map(([title, text], index) => (
            <motion.article
              key={title}
              className={styles.painItem}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={reveal}
              transition={{ duration: 0.55, delay: index * 0.08 }}
            >
              <span className={styles.painIndex}>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className={styles.organize}>
        <div className={styles.organizeVisual} aria-hidden="true">
          <div className={styles.visualHalo} />
          <div className={styles.calendarCard}>
            <div className={styles.cardTop}>
              <span>Hoje, no salão</span>
              <CalendarDays size={17} />
            </div>
            <div className={styles.appointment}>
              <span className={styles.time}>09:30</span>
              <div><strong>Camila · corte e finalização</strong><small>com Bia</small></div>
              <span className={styles.appointmentDot} />
            </div>
            <div className={styles.appointment}>
              <span className={styles.time}>11:00</span>
              <div><strong>Renata · mechas</strong><small>com Marina</small></div>
              <span className={styles.appointmentDot} />
            </div>
            <div className={styles.appointmentMuted}>
              <span className={styles.time}>14:00</span>
              <span>Horário disponível</span>
            </div>
          </div>
          <div className={styles.clientCard}>
            <span className={styles.clientAvatar}>C</span>
            <div><strong>Camila chegou</strong><small>Cliente recorrente</small></div>
            <Check size={17} />
          </div>
        </div>
        <motion.div
          className={styles.organizeCopy}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <p className={styles.kicker}>organização que acompanha você</p>
          <h2>Menos interrupção.<br /><em>Mais presença na cadeira.</em></h2>
          <p>
            A Lexon reúne a agenda do salão em uma visão simples de acompanhar. Você entende quem atende, o que está marcado e onde existe espaço — sem procurar informação em várias conversas.
          </p>
          <ul className={styles.checkList}>
            <li><Check size={17} /> Agenda por profissional e por serviço</li>
            <li><Check size={17} /> Cadastro organizado de clientes</li>
            <li><Check size={17} /> Página de agendamento com a identidade do salão</li>
          </ul>
        </motion.div>
      </section>

      <section className={styles.ritual}>
        <div className={styles.ritualHeader}>
          <p className={styles.kicker}>um cuidado em cada etapa</p>
          <h2>Da escolha do horário<br />ao pós-atendimento.</h2>
        </div>
        <div className={styles.ritualGrid}>
          <article>
            <Sparkles size={24} strokeWidth={1.5} />
            <span>Para a cliente</span>
            <h3>Um caminho leve para marcar.</h3>
            <p>Ela encontra seus serviços, escolhe um horário e chega ao salão sabendo que está tudo certo.</p>
          </article>
          <article>
            <Scissors size={24} strokeWidth={1.5} />
            <span>Para a equipe</span>
            <h3>Clareza para cada profissional.</h3>
            <p>Cada pessoa acompanha a própria agenda, sem perder de vista o que faz parte do seu dia.</p>
          </article>
          <article>
            <MessageCircle size={24} strokeWidth={1.5} />
            <span>Para a gestão</span>
            <h3>Conversas que podem entrar no fluxo.</h3>
            <p>Quando fizer sentido, a automação de WhatsApp pode ser adicionada ao plano para apoiar sua operação.</p>
          </article>
        </div>
      </section>

      <section className={styles.whatsappSection}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <p className={styles.kicker}>quando você quiser dar o próximo passo</p>
          <h2>O WhatsApp pode trabalhar <em>com</em> o seu salão.</h2>
          <p>
            A automação é uma escolha para quando a sua rotina pedir esse apoio. Ela é contratada à parte e sua taxa é combinada na negociação — com clareza antes de qualquer ativação.
          </p>
          <a href={whatsappUrl} className={styles.outlineButton}>
            Entender a automação para meu salão <ArrowUpRight size={18} />
          </a>
        </motion.div>
        <div className={styles.messageBubble} aria-hidden="true">
          <p>Olá, Camila! Seu horário está separado para hoje. ✨</p>
          <span>Mensagem do salão</span>
        </div>
      </section>

      <section className={styles.pricing} id="planos">
        <motion.div
          className={styles.pricingHeader}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={reveal}
          transition={{ duration: 0.65 }}
        >
          <p className={styles.kicker}>planos para o momento do seu salão</p>
          <h2>Escolha a base que combina<br />com a sua rotina.</h2>
          <p>Você começa com a agenda que precisa hoje e evolui quando fizer sentido.</p>
        </motion.div>

        <div className={styles.planColumns}>
          <motion.article
            className={styles.plan}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            transition={{ duration: 0.55 }}
          >
            <div className={styles.planIcon}><Zap size={19} /></div>
            <p className={styles.planName}>Agenda</p>
            <p className={styles.planDescription}>Para começar com uma agenda online simples e profissional.</p>
            <p className={styles.price}><span>R$ 59</span><small>/mês</small></p>
            <p className={styles.freeMonth}>Primeiro mês da plataforma grátis</p>
            <a href="/whatsapp?source=saloes&intent=plan_interest&plan=agenda&text=Ol%C3%A1!%20Quero%20conhecer%20o%20plano%20Agenda%20para%20meu%20sal%C3%A3o." className={styles.planButton}>Quero este plano <ArrowUpRight size={16} /></a>
            <ul>
              <li><Check size={15} /> 1 profissional</li>
              <li><Check size={15} /> Agenda e página de agendamento</li>
              <li><Check size={15} /> Serviços e clientes organizados</li>
              <li className={styles.mutedFeature}>Automação por WhatsApp não incluída</li>
            </ul>
          </motion.article>

          <motion.article
            className={`${styles.plan} ${styles.featuredPlan}`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            transition={{ duration: 0.55, delay: 0.08 }}
          >
            <span className={styles.planLabel}>mais flexível</span>
            <div className={styles.planIcon}><Crown size={19} /></div>
            <p className={styles.planName}>Profissional</p>
            <p className={styles.planDescription}>Para uma operação mais completa, com espaço para crescer.</p>
            <p className={styles.price}><span>R$ 89</span><small>/mês</small></p>
            <p className={styles.freeMonth}>Primeiro mês da plataforma grátis</p>
            <a href="/whatsapp?source=saloes&intent=plan_interest&plan=profissional&text=Ol%C3%A1!%20Quero%20conhecer%20o%20plano%20Profissional%20para%20meu%20sal%C3%A3o." className={styles.planButton}>Quero este plano <ArrowUpRight size={16} /></a>
            <ul>
              <li><Check size={15} /> Até 3 profissionais</li>
              <li><Check size={15} /> Identidade visual do salão</li>
              <li><Check size={15} /> CRM e painel financeiro</li>
              <li><Check size={15} /> Automação disponível com taxa extra</li>
            </ul>
          </motion.article>

          <motion.article
            className={`${styles.plan} ${styles.metaPlan}`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={reveal}
            transition={{ duration: 0.55, delay: 0.16 }}
          >
            <span className={styles.metaLabel}>API oficial da Meta</span>
            <div className={styles.planIcon}><Building2 size={19} /></div>
            <p className={styles.planName}>Automação</p>
            <p className={styles.planDescription}>Para quem quer colocar o WhatsApp dentro da operação.</p>
            <p className={styles.price}><span>R$ 169</span><small>/mês</small></p>
            <p className={styles.planSpacer} aria-hidden="true" />
            <a href="/whatsapp?source=saloes&intent=plan_interest&plan=automacao&text=Ol%C3%A1!%20Quero%20conhecer%20o%20plano%20Automa%C3%A7%C3%A3o%20para%20meu%20sal%C3%A3o." className={styles.planButton}>Quero falar sobre este plano <ArrowUpRight size={16} /></a>
            <ul>
              <li><Check size={15} /> Até 6 profissionais</li>
              <li><Check size={15} /> Automação por WhatsApp inclusa</li>
              <li><Check size={15} /> Confirmações, lembretes e reativação</li>
              <li className={styles.metaFeature}><Check size={15} /> Opção de conexão pela API oficial da Meta</li>
            </ul>
          </motion.article>
        </div>
        <p className={styles.pricingNote}>A automação é um serviço contratado à parte quando você optar por ativá-la. No plano Automação, ela já faz parte da mensalidade. As cobranças de conversas e templates da Meta são contratadas diretamente com a Meta.</p>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.kicker}>seu salão, do seu jeito</p>
        <h2>Dê à sua agenda o mesmo cuidado que você dá ao seu espaço.</h2>
        <a href={whatsappUrl} className={styles.primaryButton}>
          Começar para meu salão <ArrowUpRight size={18} />
        </a>
        <p className={styles.finalNote}>O primeiro mês da plataforma é grátis para você conhecer a experiência.</p>
      </section>

      <footer className={styles.footer}>
        <a href="/" className={styles.brand}><span className={styles.brandMark}>L</span><span>lexon<span className={styles.brandDot}>.</span></span></a>
        <span>Agenda pensada para negócios de beleza.</span>
        <span>© {new Date().getFullYear()} Lexon Agenda</span>
      </footer>
    </main>
  );
}
