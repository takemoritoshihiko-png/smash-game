// ===== QUESTION DATA (Grade 6-8 International School) =====
const questions = {
  vocabulary: [
    // --- School/Academic (easier) ---
    {q:"The teacher gave us a new ___ to complete by Friday.", choices:["absence","assignment","substitute","permission"], answer:1, expl:"An assignment is a task or piece of work given to students by a teacher."},
    {q:"What does \"deadline\" mean?", choices:["The start of a project","The last day to submit work","A type of exam","A study break"], answer:1, expl:"A deadline is the latest time by which something must be completed or submitted."},
    {q:"A \"presentation\" is when you ___.", choices:["take a written test","speak in front of a group about a topic","read silently at your desk","do homework at home"], answer:1, expl:"A presentation means standing up and explaining a topic to an audience."},
    {q:"In science class, an \"experiment\" is ___.", choices:["a guess about what will happen","a test done to discover something","a chapter in the textbook","the final grade on a report"], answer:1, expl:"An experiment is a scientific test carried out to discover or prove something."},
    {q:"A \"hypothesis\" is ___.", choices:["the result of an experiment","a type of lab equipment","an educated guess you can test","a summary of your notes"], answer:2, expl:"A hypothesis is a prediction you make before an experiment that can be tested."},
    {q:"Your school \"schedule\" shows ___.", choices:["your test scores","which classes you have and when","the lunch menu","your homework answers"], answer:1, expl:"A schedule is a timetable that shows the plan of classes and their times."},
    {q:"You need \"permission\" from a teacher to ___.", choices:["sit in your assigned seat","open your textbook","leave the classroom early","listen during a lecture"], answer:2, expl:"Permission means approval or consent from someone in authority to do something."},
    {q:"If a student has an \"absence,\" it means ___.", choices:["they arrived early","they were not at school","they got a perfect score","they finished their work quickly"], answer:1, expl:"Absence means not being present; the student was not at school that day."},
    {q:"A \"substitute\" teacher is someone who ___.", choices:["teaches your class when your regular teacher is away","helps you after school","grades your exams","designs the curriculum"], answer:0, expl:"A substitute replaces someone temporarily \u2014 here, a teacher filling in for the regular one."},
    {q:"The \"curriculum\" is ___.", choices:["a single homework assignment","the school cafeteria menu","the set of subjects and topics taught at a school","a type of classroom"], answer:2, expl:"Curriculum refers to the overall plan of subjects and content taught at a school."},
    // --- Emotions (moderate) ---
    {q:"She felt ___ before her presentation because she hadn't practiced enough.", choices:["confident","anxious","relieved","grateful"], answer:1, expl:"Anxious means feeling worried or nervous about something uncertain."},
    {q:"After struggling with the math problem for an hour, Tom felt ___.", choices:["motivated","embarrassed","frustrated","jealous"], answer:2, expl:"Frustrated means feeling upset or annoyed because you cannot achieve something."},
    {q:"When she finally passed her exam, she felt ___ and proud.", choices:["overwhelmed","exhausted","anxious","confident"], answer:3, expl:"Confident means feeling sure about your own abilities and success."},
    {q:"He was ___ when his test came back with a much higher score than expected.", choices:["frustrated","jealous","embarrassed","relieved"], answer:3, expl:"Relieved means feeling happy because something stressful is over or went well."},
    {q:"Having three projects due on the same day made her feel ___.", choices:["grateful","motivated","overwhelmed","jealous"], answer:2, expl:"Overwhelmed means feeling like there is too much to handle at once."},
    {q:"He tripped in front of the whole class and felt very ___.", choices:["confident","motivated","exhausted","embarrassed"], answer:3, expl:"Embarrassed means feeling ashamed or awkward in front of others."},
    {q:"The coach's speech before the game made the whole team feel ___.", choices:["anxious","motivated","frustrated","jealous"], answer:1, expl:"Motivated means feeling eager and driven to do something."},
    {q:"She was ___ of her classmate who won the art competition.", choices:["relieved","grateful","exhausted","jealous"], answer:3, expl:"Jealous means wanting what someone else has, or feeling envious of their success."},
    {q:"I'm ___ to my tutor for helping me improve my writing.", choices:["frustrated","embarrassed","grateful","anxious"], answer:2, expl:"Grateful means feeling thankful and appreciative for someone's help."},
    // --- Mixed sentence completion (harder) ---
    {q:"After running the 5K race, all the students felt completely ___.", choices:["motivated","jealous","anxious","exhausted"], answer:3, expl:"Exhausted means extremely tired, with no energy left."},
    {q:"The teacher asked for a volunteer, but nobody had the ___ to raise their hand.", choices:["absence","permission","confidence","schedule"], answer:2, expl:"Confidence is the belief in your own ability; without it, you hesitate to act."},
    {q:"Our group needs to ___ our findings to the whole class tomorrow.", choices:["postpone","present","substitute","assign"], answer:1, expl:"Present means to show or explain something to an audience."},
    {q:"The school changed its ___ to include a new coding class.", choices:["deadline","hypothesis","absence","curriculum"], answer:3, expl:"Curriculum is the set of courses and content taught at a school; adding coding changes it."},
    {q:"Please ask for ___ before using the lab equipment.", choices:["experiment","permission","schedule","presentation"], answer:1, expl:"Permission means getting approval before doing something, especially from authority."},
    {q:"His ___ from school for a week meant he had a lot of work to catch up on.", choices:["deadline","substitute","absence","curriculum"], answer:2, expl:"Absence means being away; missing a week of school means lots of missed work."}
  ],
  grammar: [
    // --- Present perfect ---
    {q:"I ___ already finished my homework.", choices:["had","have","am","was"], answer:1, expl:"'I have finished' is present perfect. Use 'have' with I/you/we/they."},
    {q:"She ___ never visited another country before.", choices:["have","is","has","was"], answer:2, expl:"'She' is third person singular, so we use 'has' in present perfect (has + past participle)."},
    {q:"We ___ studied three chapters so far this semester.", choices:["are","have","had","will"], answer:1, expl:"'So far' signals present perfect tense. 'We have studied' shows an action continuing to now."},
    // --- Past perfect ---
    {q:"She ___ left the classroom before the bell rang.", choices:["has","have","had","is"], answer:2, expl:"Past perfect uses 'had' + past participle to show one past event happened before another."},
    {q:"By the time we arrived, the movie ___.", choices:["has started","had already started","is starting","will start"], answer:1, expl:"'By the time we arrived' refers to a past moment; the movie started even earlier, so use past perfect."},
    {q:"They ___ finished the experiment before the teacher collected the reports.", choices:["have","has","had","are"], answer:2, expl:"Two past events: finishing came first, so use past perfect 'had finished'."},
    // --- Passive voice ---
    {q:"The experiment ___ by the science class last week.", choices:["conducted","was conducted","has conducted","is conducting"], answer:1, expl:"Passive voice: the subject receives the action. 'Was conducted' = past passive."},
    {q:"The school rules ___ in the student handbook.", choices:["are explained","have explaining","is explain","were explaining"], answer:0, expl:"Passive voice with plural subject 'rules' uses 'are explained' (are + past participle)."},
    {q:"A new library ___ on campus next year.", choices:["builds","is building","will be built","has built"], answer:2, expl:"Future passive: 'will be built' because the library receives the action of being built."},
    // --- Conditional sentences ---
    {q:"If I study hard, I ___ pass the test.", choices:["would","will","had","am"], answer:1, expl:"First conditional (real/possible): If + present simple, will + base verb."},
    {q:"If she ___ more time, she would join the debate club.", choices:["has","have","had","will have"], answer:2, expl:"Second conditional (unreal/hypothetical): If + past simple ('had'), would + base verb."},
    {q:"We will miss the bus if we ___ hurry.", choices:["won't","hadn't","don't","aren't"], answer:2, expl:"First conditional: If + present simple. 'Don't hurry' is the present simple negative."},
    // --- Relative clauses ---
    {q:"The teacher ___ helped me is very kind.", choices:["which","whose","whom","who"], answer:3, expl:"'Who' is used for people as the subject of a relative clause."},
    {q:"The book ___ I borrowed from the library was fascinating.", choices:["who","whose","that","whom"], answer:2, expl:"'That' (or 'which') is used for things. 'Who' is only for people."},
    {q:"The student ___ project won first place gave a speech.", choices:["who","whose","which","that"], answer:1, expl:"'Whose' shows possession \u2014 the project belongs to the student."},
    // --- Reported speech ---
    {q:"He said that he ___ tired after the long practice.", choices:["is","was","will be","has been"], answer:1, expl:"In reported speech, present tense 'is' shifts back to past tense 'was'."},
    {q:"She told me she ___ submit her essay the next day.", choices:["will","is going to","would","can"], answer:2, expl:"In reported speech, 'will' shifts to 'would'. 'The next day' replaces 'tomorrow'."},
    {q:"The teacher announced that the test ___ postponed.", choices:["is","will","has","had been"], answer:3, expl:"In reported speech, present perfect 'has been' shifts to past perfect 'had been'."},
    // --- Modal verbs ---
    {q:"You ___ submit your essay by Friday. It's required.", choices:["might","could","must","would"], answer:2, expl:"'Must' expresses obligation or requirement. It's required = you must do it."},
    {q:"She ___ be at the library; I saw her heading that way.", choices:["must","might","should","would"], answer:1, expl:"'Might' expresses possibility when you're not certain. 'I saw her heading that way' suggests likelihood but not certainty."},
    {q:"You ___ ask before borrowing someone else's notes.", choices:["would","might","could","should"], answer:3, expl:"'Should' gives advice or suggests the right thing to do."},
    // --- Articles in academic context ---
    {q:"We need to write ___ essay about climate change.", choices:["a","an","the","no article"], answer:1, expl:"'Essay' starts with a vowel sound, so we use 'an' (not 'a')."},
    {q:"___ students in our class passed the final exam.", choices:["A","An","The","No article"], answer:2, expl:"'The students' refers to a specific group \u2014 the ones in our class."},
    {q:"She wants to become ___ engineer when she grows up.", choices:["a","an","the","no article"], answer:1, expl:"'Engineer' starts with a vowel sound, so we use 'an'."},
    {q:"___ homework that was assigned yesterday is due tomorrow.", choices:["A","An","The","No article"], answer:2, expl:"'The' is used because we're talking about specific homework (assigned yesterday)."}
  ],
  reading: [
    // --- School projects ---
    {q:"\"Maria had been working on her history project for three days. Although she felt exhausted, she was determined to finish before the deadline. When she finally submitted it, she felt an overwhelming sense of relief.\" \u2014 What does 'overwhelming' most closely mean here?",
     choices:["Small and quiet","Very strong and intense","Disappointing and sad","Completely unexpected"], answer:1, expl:"The passage says she felt exhausted but determined \u2014 her relief after finishing was very strong and intense."},
    {q:"\"The group couldn't agree on a topic for their science presentation. After a long discussion, they finally chose renewable energy because everyone found it interesting.\" \u2014 Why did the group pick renewable energy?",
     choices:["The teacher told them to","It was the easiest topic","Everyone found it interesting","It was the only option left"], answer:2, expl:"The passage directly states 'because everyone found it interesting'."},
    {q:"\"James forgot to bring his permission slip for the field trip. His teacher said he could call his parents to get verbal permission instead.\" \u2014 What was James's problem?",
     choices:["He lost his bus pass","He forgot his permission slip","His parents were out of town","The field trip was cancelled"], answer:1, expl:"The first sentence says 'James forgot to bring his permission slip'."},
    // --- Friendships ---
    {q:"\"Aisha noticed that her friend Priya had been quiet all week. During lunch, Aisha asked if everything was okay. Priya admitted she was stressed about her parents moving to a new city.\" \u2014 What can you infer about Aisha?",
     choices:["She is too busy to care about friends","She is observant and caring","She is also moving away","She doesn't like Priya"], answer:1, expl:"Aisha noticed Priya was quiet and asked about it \u2014 this shows she pays attention and cares."},
    {q:"\"After their argument, both Ravi and Sam avoided each other for days. Eventually, Ravi sent a message apologizing. Sam replied that he had also been meaning to say sorry.\" \u2014 What is the main idea of this passage?",
     choices:["Ravi and Sam are no longer friends","Arguments are always someone's fault","Both friends wanted to make up","Sam refused to forgive Ravi"], answer:2, expl:"Both Ravi and Sam apologized, showing they each wanted to reconcile."},
    // --- Sports teams ---
    {q:"\"The basketball team had lost five games in a row. Their coach decided to change the training schedule and focus more on defense. In the next game, they won by twelve points.\" \u2014 What change led to the team's improvement?",
     choices:["They got new players","They practiced less often","They focused more on defense","They changed their uniforms"], answer:2, expl:"The passage says the coach 'focus more on defense' and then they won."},
    {q:"\"Despite being the shortest player on the team, Yuki was the fastest. Her speed allowed her to steal the ball more often than anyone else.\" \u2014 What is Yuki's main strength?",
     choices:["Her height","Her speed","Her shooting accuracy","Her defensive skills"], answer:1, expl:"The passage says 'Yuki was the fastest' and her speed helped her steal the ball."},
    // --- Science topics ---
    {q:"\"Photosynthesis is the process by which plants convert sunlight into energy. Without it, plants could not produce the food they need to grow. This process also releases oxygen into the air.\" \u2014 According to the passage, what does photosynthesis release?",
     choices:["Carbon dioxide","Water vapor","Oxygen","Nitrogen"], answer:2, expl:"The last sentence states: 'This process also releases oxygen into the air.'"},
    {q:"\"The water cycle begins when the sun heats water in oceans and lakes, causing it to evaporate. The water vapor rises, cools, and forms clouds. Eventually, it falls back to Earth as precipitation.\" \u2014 What causes water to evaporate?",
     choices:["Wind pushing the water","Heat from the sun","Cold temperatures","Gravity pulling the water"], answer:1, expl:"The passage says 'the sun heats water...causing it to evaporate'."},
    // --- Travel experiences ---
    {q:"\"On their class trip to Kyoto, the students visited several ancient temples. Their guide explained that some of the buildings were over 500 years old. Many students were amazed that the wooden structures had survived for so long.\" \u2014 What surprised the students?",
     choices:["How modern the temples looked","How expensive the tickets were","How long the wooden buildings had lasted","How crowded the city was"], answer:2, expl:"The passage says students 'were amazed that the wooden structures had survived for so long'."},
    {q:"\"During the exchange program in London, Hana found it difficult to understand British English at first. After two weeks, she noticed that she could follow conversations much more easily.\" \u2014 What happened after two weeks?",
     choices:["Hana decided to go home early","Hana's listening improved","Hana stopped speaking English","Hana switched to a different school"], answer:1, expl:"The passage says she 'could follow conversations much more easily' \u2014 her listening got better."},
    // --- Inference / harder ---
    {q:"\"The substitute teacher handed out a worksheet that no one had seen before. Several students raised their hands to ask questions, but the substitute wasn't sure of the answers either. Eventually, one student found the instructions in their textbook.\" \u2014 What can you infer about the substitute?",
     choices:["They were well prepared for the class","They were not familiar with the lesson plan","They refused to help the students","They had taught this class before"], answer:1, expl:"The substitute didn't know the answers \u2014 this implies they were unfamiliar with the lesson."},
    {q:"\"Leo always completed his assignments on time, but this week he missed two deadlines. His best friend noticed and asked if something was wrong. Leo explained that his grandmother was in the hospital and he couldn't focus.\" \u2014 Why did Leo miss his deadlines?",
     choices:["He forgot about them","He was busy playing games","He was worried about his grandmother","He didn't understand the assignments"], answer:2, expl:"Leo said 'his grandmother was in the hospital and he couldn't focus' \u2014 worry was the cause."},
    {q:"\"The school announced that the annual science fair would now include a category for digital projects such as apps and websites. Many students who had never entered before said they were excited to participate this year.\" \u2014 Why were more students interested this year?",
     choices:["The prizes were bigger","A new digital category was added","The science fair was moved to a weekend","Teachers required everyone to enter"], answer:1, expl:"The passage connects the new digital category directly to students' new interest."},
    {q:"\"Although the experiment did not produce the results they expected, the students learned an important lesson: negative results can be just as valuable as positive ones because they help eliminate wrong hypotheses.\" \u2014 What is the main message of this passage?",
     choices:["Failed experiments are a waste of time","Students should always get the expected result","Unexpected results can still teach you something","Only positive results matter in science"], answer:2, expl:"The passage says 'negative results can be just as valuable' \u2014 you learn from unexpected outcomes."}
  ],
  listening: [
    // Type 1: "What did you hear?"
    {q:"\uD83D\uDD0A Listen and choose what you heard.", speech:"She submitted her assignment early.",
     choices:["She submitted her assignment early","She submitted her assignment lately","She submitted her essay early","He submitted his assignment early"], answer:0, expl:"Listen for key words: 'She', 'assignment', and 'early'. The other options change these words."},
    {q:"\uD83D\uDD0A Listen and choose what you heard.", speech:"The experiment was conducted by the students.",
     choices:["The experiment was conducted by the teachers","The experiment was connected by the students","The experiment was conducted by the students","The experience was conducted by the students"], answer:2, expl:"'Conducted' (not 'connected') and 'students' (not 'teachers') are the key words to hear."},
    {q:"\uD83D\uDD0A Listen and choose what you heard.", speech:"Please bring your textbook to class tomorrow.",
     choices:["Please bring your notebook to class tomorrow","Please bring your textbook to class today","Please bring your textbook to class tomorrow","Please take your textbook to class tomorrow"], answer:2, expl:"'Textbook' (not notebook), 'bring' (not take), and 'tomorrow' (not today) are the exact words."},
    {q:"\uD83D\uDD0A Listen and choose what you heard.", speech:"He felt relieved after finishing the test.",
     choices:["He felt relaxed after finishing the test","He felt relieved after finishing the task","He felt relieved after finishing the test","He felt believed after finishing the test"], answer:2, expl:"'Relieved' (not relaxed/believed) and 'test' (not task) match the audio exactly."},
    {q:"\uD83D\uDD0A Listen and choose what you heard.", speech:"The library is closed on weekends.",
     choices:["The library is closed on weekdays","The library is open on weekends","The library is closed on weekends","The laboratory is closed on weekends"], answer:2, expl:"'Library' (not laboratory), 'closed' (not open), and 'weekends' (not weekdays) are correct."},
    // Type 2: "What does it mean?"
    {q:"\uD83D\uDD0A Listen and choose the meaning.", speech:"I'm running late for class.",
     choices:["I am exercising before class","I am going to be late for class","I am running to the classroom","I left class early"], answer:1, expl:"'Running late' is an idiom meaning 'going to be late'. It's not about physical running."},
    {q:"\uD83D\uDD0A Listen and choose the meaning.", speech:"Could you give me a hand with this project?",
     choices:["Could you lend me your hands","Could you help me with this project","Could you hand me the project","Could you clap for my project"], answer:1, expl:"'Give me a hand' is an idiom meaning 'help me'. It doesn't literally mean hands."},
    {q:"\uD83D\uDD0A Listen and choose the meaning.", speech:"The teacher told us to hand in our homework.",
     choices:["The teacher said to raise our hands","The teacher said to submit our homework","The teacher said to hold our homework","The teacher said to copy our homework"], answer:1, expl:"'Hand in' is a phrasal verb meaning 'submit' or 'turn in' work to the teacher."},
    {q:"\uD83D\uDD0A Listen and choose the meaning.", speech:"She has a lot on her plate this week.",
     choices:["She is eating a large meal","She is carrying many plates","She is very busy this week","She is cooking for many people"], answer:2, expl:"'A lot on her plate' is an idiom meaning she has many tasks and responsibilities."},
    {q:"\uD83D\uDD0A Listen and choose the meaning.", speech:"Let's call it a day.",
     choices:["Let's make a phone call today","Let's name this day","Let's stop working for today","Let's start a new day"], answer:2, expl:"'Call it a day' is an idiom meaning to stop working and finish for today."},
    // Type 3: "Complete the sentence"
    {q:"\uD83D\uDD0A Listen and choose the missing word: 'The students were ___ about the field trip.'", speech:"The students were excited about the field trip.",
     choices:["exhausted","anxious","excited","embarrassed"], answer:2, expl:"The audio says 'excited'. Excited means feeling enthusiastic and eager."},
    {q:"\uD83D\uDD0A Listen and choose the missing word: 'You ___ finish your homework before watching TV.'", speech:"You should finish your homework before watching TV.",
     choices:["might","would","could","should"], answer:3, expl:"The audio says 'should'. Should is used for advice or the right thing to do."},
    {q:"\uD83D\uDD0A Listen and choose the missing word: 'The science fair ___ held in the gymnasium last Friday.'", speech:"The science fair was held in the gymnasium last Friday.",
     choices:["is","was","has","will be"], answer:1, expl:"The audio says 'was'. Past tense passive voice: 'was held' for a past event."},
    {q:"\uD83D\uDD0A Listen and choose the missing word: 'She ___ been studying English for three years.'", speech:"She has been studying English for three years.",
     choices:["have","has","had","is"], answer:1, expl:"The audio says 'has'. 'She' is third person singular, so 'has been studying' (present perfect continuous)."},
    {q:"\uD83D\uDD0A Listen and choose the missing word: 'If it ___ tomorrow, the game will be cancelled.'", speech:"If it rains tomorrow, the game will be cancelled.",
     choices:["rained","raining","rains","rain"], answer:2, expl:"The audio says 'rains'. First conditional: If + present simple ('rains'), will + base verb."}
  ]
};

// ===== ENEMY DATA (rebalanced: 4-6 hits to defeat) =====
const enemies = [
  {name:"Slime",   emoji:"\uD83D\uDFE2", hp:22, atk:3,  def:1, gold:10},
  {name:"Bat",     emoji:"\uD83E\uDD87", hp:26, atk:4,  def:1, gold:14},
  {name:"Goblin",  emoji:"\uD83D\uDC7A", hp:32, atk:5,  def:2, gold:20},
  {name:"Orc",     emoji:"\uD83D\uDC79", hp:40, atk:6,  def:3, gold:28},
  {name:"Wolf",    emoji:"\uD83D\uDC3A", hp:36, atk:7,  def:2, gold:26},
  {name:"Wizard",  emoji:"\uD83E\uDDD9", hp:34, atk:8,  def:3, gold:35},
  {name:"Golem",   emoji:"\uD83D\uDDFF", hp:55, atk:5,  def:6, gold:40},
  {name:"Dragon",  emoji:"\uD83D\uDC09", hp:70, atk:10, def:5, gold:60}
];

// ===== SHOP ITEMS =====
const shopItems = [
  {id:"iron_sword",     name:"Iron Sword",     icon:"\u2694\uFE0F", effect:"ATK +3",  stat:"atk", value:3,  cost:50,  type:"equip"},
  {id:"steel_sword",    name:"Steel Sword",    icon:"\uD83D\uDDE1\uFE0F", effect:"ATK +6",  stat:"atk", value:6,  cost:120, type:"equip"},
  {id:"dragon_blade",   name:"Dragon Blade",   icon:"\uD83D\uDD25", effect:"ATK +12", stat:"atk", value:12, cost:300, type:"equip"},
  {id:"leather_shield", name:"Leather Shield", icon:"\uD83D\uDEE1\uFE0F", effect:"DEF +3",  stat:"def", value:3,  cost:50,  type:"equip"},
  {id:"iron_shield",    name:"Iron Shield",    icon:"\uD83D\uDEE1\uFE0F", effect:"DEF +6",  stat:"def", value:6,  cost:120, type:"equip"},
  {id:"dragon_armor",   name:"Dragon Armor",   icon:"\uD83D\uDC89", effect:"DEF +12", stat:"def", value:12, cost:300, type:"equip"},
  {id:"hp_potion",      name:"HP Potion",      icon:"\uD83E\uDDEA", effect:"Restore 20 HP in battle", stat:"hp", value:20, cost:30, type:"consumable"}
];

// ===== STORY CHAPTERS =====
const storyChapters = [
  {
    id:0, title:"Chapter 1: The Enchanted Forest", reqLevel:5,
    icon:"\uD83C\uDF32", badge:"Forest Hero", goldReward:80, bonusHp:4,
    intro:"Deep in the Enchanted Forest, strange magic has been twisting the trees and scaring the animals. A mysterious Forest Witch has taken control, casting dark spells from her hidden lair. Your monster must brave the enchanted paths and defeat her to restore peace.",
    mobs:[
      {name:"Wild Mushroom",emoji:"\uD83C\uDF44",hp:20,atk:5,def:2,gold:8},
      {name:"Shadow Fox",emoji:"\uD83E\uDD8A",hp:25,atk:6,def:2,gold:10}
    ],
    boss:{name:"Forest Witch",emoji:"\uD83E\uDDD9\u200D\u2640\uFE0F",hp:60,atk:10,def:4,gold:40}
  },
  {
    id:1, title:"Chapter 2: The Crystal Caves", reqLevel:10,
    icon:"\uD83D\uDC8E", badge:"Crystal Champion", goldReward:120, bonusHp:6,
    intro:"Beneath the mountains lie the Crystal Caves, where precious gems glow in the darkness. But a massive Stone Golem guards the deepest cavern, crushing anyone who dares to enter. Only the bravest adventurers can shatter its stone armor.",
    mobs:[
      {name:"Cave Bat",emoji:"\uD83E\uDD87",hp:30,atk:8,def:3,gold:12},
      {name:"Rock Crab",emoji:"\uD83E\uDD80",hp:35,atk:7,def:6,gold:14},
      {name:"Crystal Spider",emoji:"\uD83D\uDD77\uFE0F",hp:28,atk:10,def:3,gold:13}
    ],
    boss:{name:"Stone Golem",emoji:"\uD83D\uDDFF",hp:100,atk:14,def:8,gold:60}
  },
  {
    id:2, title:"Chapter 3: The Sky Kingdom", reqLevel:15,
    icon:"\u2601\uFE0F", badge:"Sky Guardian", goldReward:160, bonusHp:8,
    intro:"High above the clouds floats the Sky Kingdom, a once-peaceful realm now terrorized by the Storm Griffin. Lightning strikes without warning, and fierce winds blow through the golden halls. You must fly higher than ever before to challenge this beast.",
    mobs:[
      {name:"Wind Sprite",emoji:"\uD83C\uDF2C\uFE0F",hp:35,atk:11,def:4,gold:16},
      {name:"Thunder Hawk",emoji:"\uD83E\uDD85",hp:40,atk:13,def:4,gold:18}
    ],
    boss:{name:"Storm Griffin",emoji:"\u26A1",hp:140,atk:18,def:6,gold:80}
  },
  {
    id:3, title:"Chapter 4: The Shadow Realm", reqLevel:20,
    icon:"\uD83C\uDF11", badge:"Shadow Breaker", goldReward:200, bonusHp:10,
    intro:"The Shadow Realm exists between dimensions, a twisted mirror of the real world. The Dark Sorcerer rules here, feeding on fear and doubt. His dark magic is powerful, but your knowledge of English is an even stronger weapon. Face your deepest fears and bring light to the darkness.",
    mobs:[
      {name:"Phantom",emoji:"\uD83D\uDC7B",hp:45,atk:15,def:5,gold:20},
      {name:"Dark Knight",emoji:"\u2694\uFE0F",hp:55,atk:16,def:8,gold:24},
      {name:"Nightmare",emoji:"\uD83D\uDE08",hp:50,atk:18,def:5,gold:22}
    ],
    boss:{name:"Dark Sorcerer",emoji:"\uD83E\uDDD9",hp:180,atk:22,def:8,gold:100}
  },
  {
    id:4, title:"Chapter 5: The Dragon's Throne", reqLevel:30,
    icon:"\uD83D\uDC09", badge:"Dragon Slayer", goldReward:300, bonusHp:15,
    intro:"At the peak of the world stands the Dragon's Throne, where the Ancient Dragon has slept for a thousand years. Now it has awakened, and its fiery breath threatens to engulf the entire land. Only a true master of language and courage can challenge the most powerful creature in existence.",
    mobs:[
      {name:"Lava Serpent",emoji:"\uD83D\uDC0D",hp:60,atk:20,def:7,gold:28},
      {name:"Fire Elemental",emoji:"\uD83D\uDD25",hp:55,atk:22,def:6,gold:30},
      {name:"Dragon Guard",emoji:"\uD83D\uDC32",hp:70,atk:19,def:10,gold:32}
    ],
    boss:{name:"Ancient Dragon",emoji:"\uD83D\uDC09",hp:250,atk:28,def:10,gold:150}
  }
];

// Boss-tier questions (harder)
const bossQuestions = {
  vocabulary: [
    {q:"The author's ___ description of the sunset made readers feel like they were there.", choices:["dull","vivid","reluctant","ambiguous"], answer:1, expl:"Vivid means producing strong, clear images in the mind \u2014 very detailed and lifelike."},
    {q:"Breaking the school rules has serious ___.", choices:["consequences","phenomena","hypotheses","absences"], answer:0, expl:"Consequences are the results or effects of an action, especially negative ones."},
    {q:"A \"phenomenon\" is ___.", choices:["a common everyday event","a type of experiment","an observable event that is remarkable","a prediction about the future"], answer:2, expl:"A phenomenon is something that can be observed and is unusual or remarkable."},
    {q:"He was ___ to join the debate team because he feared public speaking.", choices:["ambitious","confident","reluctant","grateful"], answer:2, expl:"Reluctant means unwilling or hesitant to do something."},
    {q:"The instructions were ___, so nobody knew what to do.", choices:["vivid","precise","reluctant","ambiguous"], answer:3, expl:"Ambiguous means having more than one possible meaning; unclear or confusing."},
    {q:"She gave a ___ argument that convinced the entire class.", choices:["fragile","compelling","reluctant","trivial"], answer:1, expl:"Compelling means very convincing and powerful \u2014 hard to argue against."},
    {q:"The scientist needed more ___ before drawing a conclusion.", choices:["evidence","absence","permission","curriculum"], answer:0, expl:"Evidence is the facts or information that support or prove something."},
    {q:"His excuse sounded ___, so the teacher didn't believe him.", choices:["credible","inevitable","implausible","preliminary"], answer:2, expl:"Implausible means not believable or hard to accept as true."}
  ],
  grammar: [
    {q:"If I ___ known about the test, I would have studied harder.", choices:["have","has","had","would"], answer:2, expl:"Third conditional (past unreal): If + had + past participle. 'Had known' is correct."},
    {q:"She wishes she ___ more time to finish the project.", choices:["has","have","had","having"], answer:2, expl:"'Wish' + past simple expresses a desire for something unreal. 'Had' is subjunctive mood."},
    {q:"Not only ___ she pass the exam, but she also got the highest score.", choices:["does","did","has","was"], answer:1, expl:"'Not only' at the start requires inversion. Past tense \u2192 'did she pass'."},
    {q:"The research paper, ___ was published last month, received international attention.", choices:["that","who","which","whom"], answer:2, expl:"Non-restrictive relative clause (with commas) uses 'which', not 'that', for things."},
    {q:"Had the students ___ more carefully, they would have found the error.", choices:["read","reads","reading","been read"], answer:0, expl:"Inverted third conditional: Had + subject + past participle. 'Read' (past participle) is correct."},
    {q:"It is essential that every student ___ the assignment on time.", choices:["submits","submit","submitted","submitting"], answer:1, expl:"Subjunctive mood after 'essential that': use the base form 'submit' (no -s)."},
    {q:"The teacher insisted that he ___ his essay before the deadline.", choices:["rewrites","rewrite","rewrote","rewriting"], answer:1, expl:"Subjunctive mood after 'insisted that': use the base form 'rewrite'."},
    {q:"Neither the students nor the teacher ___ aware of the schedule change.", choices:["were","was","are","have been"], answer:1, expl:"With 'neither...nor', the verb agrees with the nearest subject: 'teacher' (singular) \u2192 'was'."}
  ],
  reading: [
    {q:"\"The expedition team had been climbing for six days when the weather suddenly changed. Dark clouds gathered, and the temperature dropped by 15 degrees in an hour. The team leader decided to set up camp immediately rather than risk the summit.\" \u2014 The leader's decision shows he valued ___.",
     choices:["reaching the top quickly","the team's safety over the goal","proving his courage","ignoring the weather forecast"], answer:1, expl:"He chose to stop rather than risk danger \u2014 prioritizing safety over reaching the summit."},
    {q:"\"Dr. Chen's research revealed that students who read for pleasure scored significantly higher on vocabulary tests than those who only read textbooks. She suggested that schools should encourage free reading time during the school day.\" \u2014 What is Dr. Chen's main recommendation?",
     choices:["Stop using textbooks entirely","Test vocabulary more often","Add free reading time to school","Only read fiction books"], answer:2, expl:"The passage says she 'suggested that schools should encourage free reading time during the school day'."},
    {q:"\"The ancient Romans built aqueducts to carry water from distant sources into their cities. Some of these structures still stand today, over two thousand years later, demonstrating the remarkable engineering skills of that era.\" \u2014 The word 'remarkable' most closely means ___.",
     choices:["ordinary and common","impressive and noteworthy","outdated and useless","simple and basic"], answer:1, expl:"The fact that structures lasted 2000+ years is impressive and noteworthy, i.e. remarkable."},
    {q:"\"When Maya moved to a new country, she couldn't understand anyone at school. But she noticed that smiling was a universal language. Within a month, she had made several friends, even before she could speak their language fluently.\" \u2014 What helped Maya make friends?",
     choices:["Learning the language quickly","Her excellent grades","Her friendly attitude and smiles","Her teacher introducing her"], answer:2, expl:"The passage says 'smiling was a universal language' and she made friends before speaking fluently."}
  ]
};

// ===== MONSTER ROSTER & GACHA =====
const monsterRoster = [
  {id:1,name:'Blue Slime',element:'Water',emoji:'\uD83C\uDF0A',color:'#2980b9',rarity:'Normal',hp:20,atk:5,def:3,trait:'Starter',img:'monster-1.png'},
  {id:2,name:'Fire Fox',element:'Fire',emoji:'\uD83D\uDD25',color:'#e74c3c',rarity:'Normal',hp:18,atk:8,def:2,trait:'ATK +20%',img:'monster-2.png'},
  {id:3,name:'Stone Golem',element:'Earth',emoji:'\uD83C\uDF0D',color:'#8B6914',rarity:'Normal',hp:25,atk:4,def:10,trait:'DEF +30%',img:'monster-3.png'},
  {id:4,name:'Thunder Bird',element:'Thunder',emoji:'\u26A1',color:'#f1c40f',rarity:'Rare',hp:18,atk:7,def:4,trait:'SPD +30%',img:'monster-4.png'},
  {id:5,name:'Ice Wolf',element:'Ice',emoji:'\u2744\uFE0F',color:'#5dade2',rarity:'Rare',hp:28,atk:6,def:5,trait:'HP +30%',img:'monster-5.png'},
  {id:6,name:'Dark Bat',element:'Dark',emoji:'\uD83C\uDF11',color:'#6c3483',rarity:'Rare',hp:22,atk:9,def:5,trait:'Balanced',img:'monster-6.png'},
  {id:7,name:'Wind Dragon',element:'Wind',emoji:'\uD83D\uDCA8',color:'#27ae60',rarity:'Super Rare',hp:25,atk:11,def:7,trait:'All +15%',img:'monster-7.png'},
  {id:8,name:'Lava Titan',element:'Fire/Earth',emoji:'\uD83C\uDF0B',color:'#d35400',rarity:'Super Rare',hp:22,atk:14,def:12,trait:'ATK+DEF',img:'monster-8.png'},
  {id:9,name:'Storm Phoenix',element:'Thunder/Wind',emoji:'\uD83E\uDD85',color:'#8e44ad',rarity:'Super Rare',hp:28,atk:12,def:8,trait:'Epic evo',img:'monster-9.png'},
  {id:10,name:'Celestial Beast',element:'Light',emoji:'\u2728',color:'#f1c40f',rarity:'Legend',hp:35,atk:15,def:12,trait:'All highest',img:'monster-10.png'}
];

