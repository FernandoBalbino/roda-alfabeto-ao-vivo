// Banco da Roda do Alfabeto Tech (copiado do Jogo 19 da CentralJogos).
// Fica só no servidor: as respostas não vão para o navegador dos alunos.
// rule: "starts" (a resposta começa com a letra) ou "contains" (a resposta contém a letra).
import type { Rule } from "../shared/protocol.ts";

export interface Question {
  id: string;
  letter: string;
  rule: Rule;
  category: string;
  answer: string;
  accepted: string[];
  clue: string;
}

const q = (id: string, letter: string, rule: Rule, category: string, answer: string, accepted: string[], clue: string): Question =>
  ({ id, letter, rule, category, answer, accepted, clue });

export const QUESTIONS: Question[] = [
  q("a-antivirus", "A", "starts", "software", "Antivírus", ["antivirus"],
    "Programa de segurança que procura, bloqueia e remove vírus e outros softwares maliciosos do computador."),
  q("a-aplicativo", "A", "starts", "software", "Aplicativo", ["aplicativo", "aplicativos", "app", "apps"],
    "Programa instalado no celular, no tablet ou no computador para realizar uma tarefa específica, como conversar, estudar ou editar fotos."),
  q("a-alto-falante", "A", "starts", "periferico", "Alto-falante", ["alto-falante", "alto falante", "alto-falantes", "alto falantes"],
    "Componente que transforma sinais elétricos em som; fica dentro das caixas de som, dos fones e dos notebooks."),

  q("b-bios", "B", "starts", "software", "BIOS", ["bios"],
    "Pequeno programa gravado em um chip da placa-mãe que testa as peças e dá a partida no computador assim que ele é ligado."),
  q("b-bluetooth", "B", "starts", "internet", "Bluetooth", ["bluetooth"],
    "Tecnologia sem fio de curto alcance usada para conectar fones, caixas de som, mouses e teclados sem precisar de cabo."),
  q("b-byte", "B", "starts", "hardware", "Byte", ["byte", "bytes"],
    "Unidade de informação formada por um conjunto de 8 bits."),
  q("b-backup", "B", "starts", "software", "Backup", ["backup", "backups", "becape"],
    "Cópia de segurança dos arquivos, guardada em outro lugar para recuperar os dados se o original for perdido."),

  q("c-cooler", "C", "starts", "hardware", "Cooler", ["cooler", "coolers"],
    "Conjunto de ventoinha e dissipador que resfria o processador e evita o superaquecimento do computador."),
  q("c-cpu", "C", "starts", "hardware", "CPU", ["cpu"],
    "Sigla em inglês da Unidade Central de Processamento, outro nome dado ao processador."),
  q("c-chromebook", "C", "starts", "hardware", "Chromebook", ["chromebook", "chromebooks"],
    "Notebook que vem com o sistema ChromeOS, do Google, e funciona principalmente com aplicativos e arquivos guardados na internet."),

  q("d-driver", "D", "starts", "software", "Driver", ["driver", "drivers"],
    "Software que ensina o sistema operacional a se comunicar com um equipamento, como a impressora ou a placa de vídeo."),
  q("d-disco-rigido", "D", "starts", "hardware", "Disco rígido", ["disco rigido", "disco duro"],
    "Dispositivo de armazenamento, também chamado de HD, que guarda os dados em discos magnéticos que giram em alta velocidade."),
  q("d-desktop", "D", "starts", "hardware", "Desktop", ["desktop", "desktops"],
    "Palavra em inglês para o computador de mesa, que fica fixo em um lugar e tem gabinete, monitor, teclado e mouse separados."),
  q("d-download", "D", "starts", "internet", "Download", ["download", "downloads"],
    "Ação de copiar um arquivo da internet para o seu computador ou celular."),

  q("e-estabilizador", "E", "starts", "hardware", "Estabilizador", ["estabilizador", "estabilizadores"],
    "Equipamento ligado entre a tomada e o computador que corrige pequenas variações na tensão da energia elétrica."),
  q("e-entrada", "E", "starts", "periferico", "Entrada", ["entrada", "entradas"],
    "Tipo de periférico que envia informações para o computador, como o teclado, o mouse e o microfone."),
  q("e-email", "E", "starts", "internet", "E-mail", ["e-mail", "email", "e-mails", "emails"],
    "Correio eletrônico: serviço para enviar e receber mensagens e arquivos pela internet."),

  q("f-firewall", "F", "starts", "software", "Firewall", ["firewall", "firewalls"],
    "Barreira de segurança que controla o que pode entrar e sair da rede, bloqueando conexões suspeitas."),
  q("f-fonte", "F", "starts", "hardware", "Fonte de alimentação", ["fonte de alimentacao", "fonte", "fontes"],
    "Peça do gabinete que converte a energia da tomada em energia adequada para a placa-mãe e os outros componentes."),
  q("f-fone", "F", "starts", "periferico", "Fone de ouvido", ["fone de ouvido", "fones de ouvido", "fone", "fones"],
    "Periférico de saída usado bem perto das orelhas para ouvir sons sem incomodar as outras pessoas."),

  q("g-gabinete", "G", "starts", "hardware", "Gabinete", ["gabinete", "gabinetes"],
    "Caixa que abriga e protege a placa-mãe, o processador, a memória e os outros componentes internos do computador de mesa."),
  q("g-gigabyte", "G", "starts", "hardware", "Gigabyte", ["gigabyte", "gigabytes", "gb", "giga"],
    "Unidade de medida equivalente a cerca de mil megabytes, usada para indicar o tamanho da memória e do armazenamento."),
  q("g-gpu", "G", "starts", "hardware", "GPU", ["gpu"],
    "Sigla em inglês do processador gráfico, chip especializado em criar as imagens, os vídeos e os jogos exibidos na tela."),

  q("h-hardware", "H", "starts", "hardware", "Hardware", ["hardware"],
    "Parte física do computador: tudo o que podemos tocar, como peças, cabos e periféricos."),
  q("h-hdmi", "H", "starts", "hardware", "HDMI", ["hdmi"],
    "Cabo e conector digital que leva imagem e som em alta qualidade do computador para o monitor, a TV ou o projetor."),
  q("h-headset", "H", "starts", "periferico", "Headset", ["headset", "headsets"],
    "Fone de ouvido com microfone acoplado, considerado um periférico de entrada e saída ao mesmo tempo."),

  q("i-impressora", "I", "starts", "periferico", "Impressora", ["impressora", "impressoras"],
    "Periférico de saída que transfere textos e imagens do computador para o papel."),
  q("i-internet", "I", "starts", "internet", "Internet", ["internet"],
    "Rede mundial que conecta bilhões de dispositivos e permite acessar sites, enviar mensagens e assistir a vídeos."),
  q("i-icone", "I", "starts", "software", "Ícone", ["icone", "icones"],
    "Pequena imagem na tela que representa um programa, um arquivo ou uma pasta."),

  q("j-joystick", "J", "starts", "periferico", "Joystick", ["joystick", "joysticks", "joystic"],
    "Periférico de entrada em forma de alavanca ou controle, muito usado para jogar."),
  q("j-jpg", "J", "starts", "software", "JPG", ["jpg", "jpeg"],
    "Extensão de arquivo de imagem muito usada para fotografias tiradas com o celular ou com a câmera."),
  q("j-janela", "J", "starts", "software", "Janela", ["janela", "janelas"],
    "Área retangular da tela onde um programa, uma pasta ou um documento fica aberto e pode ser minimizado, maximizado ou fechado."),

  q("k-kilobyte", "K", "starts", "hardware", "Kilobyte", ["kilobyte", "kilobytes", "kb", "kbyte"],
    "Unidade de medida equivalente a cerca de mil bytes, usada para indicar o tamanho de arquivos bem pequenos."),
  q("k-notebook", "K", "contains", "hardware", "Notebook", ["notebook", "notebooks"],
    "Computador portátil que reúne tela, teclado, touchpad e bateria em um único equipamento."),
  q("k-link", "K", "contains", "internet", "Link", ["link", "links", "hiperlink", "hyperlink"],
    "Texto ou imagem clicável que leva para outra página, outro site ou um arquivo."),

  q("l-linux", "L", "starts", "software", "Linux", ["linux"],
    "Sistema operacional gratuito e de código aberto, criado por Linus Torvalds e representado por um pinguim."),
  q("l-lixeira", "L", "starts", "software", "Lixeira", ["lixeira", "lixeira do windows"],
    "Local do Windows para onde vão os arquivos excluídos, que ainda podem ser restaurados antes de ela ser esvaziada."),
  q("l-login", "L", "starts", "internet", "Login", ["login", "logon", "logar"],
    "Ação de entrar em um sistema ou site informando seu usuário e sua senha."),

  q("m-mouse", "M", "starts", "periferico", "Mouse", ["mouse", "mouses"],
    "Periférico de entrada que movimenta o ponteiro na tela e permite clicar, arrastar e selecionar itens."),
  q("m-monitor", "M", "starts", "periferico", "Monitor", ["monitor", "monitores"],
    "Periférico de saída que exibe as imagens geradas pelo computador."),
  q("m-memoria-ram", "M", "starts", "hardware", "Memória RAM", ["memoria ram", "memorias ram", "memoria"],
    "Peça de armazenamento temporário onde ficam os programas abertos; tudo o que está nela é apagado quando o computador desliga."),
  q("m-microfone", "M", "starts", "periferico", "Microfone", ["microfone", "microfones", "mic"],
    "Periférico de entrada que capta a voz e outros sons para o computador."),

  q("n-navegador", "N", "starts", "software", "Navegador", ["navegador", "navegadores", "navegador de internet", "navegador web"],
    "Programa usado para acessar sites, como o Chrome, o Firefox e o Edge."),
  q("n-nobreak", "N", "starts", "hardware", "Nobreak", ["nobreak", "no-break", "no break", "nobreaks"],
    "Equipamento com bateria que mantém o computador ligado por alguns minutos quando falta energia elétrica."),
  q("n-nuvem", "N", "starts", "internet", "Nuvem", ["nuvem"],
    "Armazenamento na internet que permite guardar arquivos e abri-los de qualquer lugar, como acontece no Google Drive."),

  q("o-offline", "O", "starts", "internet", "Offline", ["offline", "off-line", "off line"],
    "Situação de um computador ou aplicativo que está sem conexão com a internet."),
  q("o-online", "O", "starts", "internet", "Online", ["online", "on-line", "on line"],
    "Situação de quem está conectado à internet naquele momento."),
  q("o-oculos-vr", "O", "starts", "periferico", "Óculos de realidade virtual", ["oculos de realidade virtual", "oculos vr", "oculos rv", "oculos"],
    "Periférico usado no rosto que mostra imagens em 360 graus e faz a pessoa se sentir dentro de um jogo ou de um ambiente digital."),

  q("p-processador", "P", "starts", "hardware", "Processador", ["processador", "processadores"],
    "Peça considerada o cérebro do computador, responsável por executar as instruções dos programas."),
  q("p-placa-mae", "P", "starts", "hardware", "Placa-mãe", ["placa-mae", "placa mae", "placas-mae", "placas mae"],
    "Principal placa de circuito do computador, onde se encaixam o processador, a memória e as outras peças."),
  q("p-pen-drive", "P", "starts", "hardware", "Pen drive", ["pen drive", "pendrive", "pen-drive", "pen drives", "pendrives"],
    "Pequeno dispositivo de armazenamento portátil que se conecta à porta USB."),
  q("p-periferico", "P", "starts", "periferico", "Periférico", ["periferico", "perifericos"],
    "Nome dado a qualquer equipamento ligado ao computador para enviar ou receber informações, como teclado, mouse e impressora."),

  q("q-qr-code", "Q", "starts", "internet", "QR Code", ["qr code", "qrcode", "qr"],
    "Código quadrado, formado por pequenos quadradinhos pretos e brancos, que a câmera do celular lê para abrir um link."),
  q("q-arquivo", "Q", "contains", "software", "Arquivo", ["arquivo", "arquivos"],
    "Conjunto de dados salvo com um nome, como um documento, uma foto ou uma música."),
  q("q-disquete", "Q", "contains", "hardware", "Disquete", ["disquete", "disquetes"],
    "Disco magnético flexível e antigo, usado para guardar arquivos antes de existir o pen drive."),

  q("r-roteador", "R", "starts", "internet", "Roteador", ["roteador", "roteadores", "router"],
    "Equipamento que distribui a conexão de internet para vários dispositivos, por cabo ou sem fio."),
  q("r-resolucao", "R", "starts", "hardware", "Resolução", ["resolucao"],
    "Medida da quantidade de pontos que uma tela exibe na largura e na altura, como 1920 × 1080."),
  q("r-reiniciar", "R", "starts", "software", "Reiniciar", ["reiniciar", "reinicializar", "reiniciar o computador"],
    "Comando que desliga e liga o computador novamente, muito usado para resolver travamentos e terminar a instalação de programas."),

  q("s-software", "S", "starts", "software", "Software", ["software", "softwares"],
    "Parte lógica do computador: os programas e sistemas que dizem ao hardware o que fazer."),
  q("s-scanner", "S", "starts", "periferico", "Scanner", ["scanner", "scanners", "scaner"],
    "Periférico de entrada que digitaliza documentos e fotos em papel, transformando-os em arquivos no computador."),
  q("s-ssd", "S", "starts", "hardware", "SSD", ["ssd"],
    "Unidade de armazenamento sem partes móveis, muito mais rápida e silenciosa que o HD tradicional."),
  q("s-sistema-operacional", "S", "starts", "software", "Sistema operacional", ["sistema operacional", "sistemas operacionais", "so"],
    "Software principal do computador, que gerencia as peças e os arquivos e permite abrir os outros programas."),

  q("t-teclado", "T", "starts", "periferico", "Teclado", ["teclado", "teclados"],
    "Periférico de entrada com teclas usado para digitar letras, números e comandos."),
  q("t-touchpad", "T", "starts", "periferico", "Touchpad", ["touchpad", "touch pad", "touch-pad", "trackpad"],
    "Superfície sensível ao toque que substitui o mouse nos notebooks e Chromebooks."),
  q("t-touchscreen", "T", "starts", "periferico", "Touchscreen", ["touchscreen", "touch screen", "tela touch", "tela touchscreen", "tela sensivel ao toque", "tela de toque"],
    "Tela que é periférico de entrada e saída ao mesmo tempo, porque mostra imagens e também recebe toques dos dedos."),

  q("u-usb", "U", "starts", "hardware", "USB", ["usb"],
    "Padrão de conexão usado para ligar pen drives, mouses, teclados e muitos outros dispositivos ao computador."),
  q("u-ubuntu", "U", "starts", "software", "Ubuntu", ["ubuntu"],
    "Sistema operacional gratuito e de código aberto, com visual amigável, muito usado em escolas e laboratórios de informática."),
  q("u-upload", "U", "starts", "internet", "Upload", ["upload", "uploads"],
    "Ação de enviar um arquivo do seu computador ou celular para a internet, como ao postar uma foto."),

  q("v-virus", "V", "starts", "software", "Vírus", ["virus", "virus de computador"],
    "Programa malicioso que se espalha entre arquivos e computadores e pode danificar dados ou roubar informações."),
  q("v-volatil", "V", "starts", "hardware", "Volátil", ["volatil"],
    "Característica de uma memória que perde todo o seu conteúdo quando o computador é desligado, como acontece com a RAM."),
  q("v-vga", "V", "starts", "hardware", "VGA", ["vga"],
    "Conector de vídeo antigo, geralmente azul e com parafusos, usado para ligar monitores e projetores."),

  q("w-webcam", "W", "starts", "periferico", "Webcam", ["webcam", "webcams", "web cam"],
    "Câmera ligada ao computador, usada em videochamadas e aulas online; é um periférico de entrada."),
  q("w-wifi", "W", "starts", "internet", "Wi-Fi", ["wi-fi", "wifi", "wi fi", "wireless"],
    "Tecnologia de rede sem fio que conecta computadores e celulares à internet por ondas de rádio."),
  q("w-windows", "W", "starts", "software", "Windows", ["windows"],
    "Sistema operacional da Microsoft, o mais usado em computadores pessoais no mundo."),

  q("x-xlsx", "X", "starts", "software", "XLSX", ["xlsx", "xls"],
    "Extensão dos arquivos de planilha criados no Microsoft Excel."),
  q("x-pixel", "X", "contains", "hardware", "Pixel", ["pixel", "pixels"],
    "Menor ponto que forma uma imagem digital na tela."),
  q("x-caixa-de-som", "X", "contains", "periferico", "Caixa de som", ["caixa de som", "caixas de som", "caixinha de som", "caixa"],
    "Periférico de saída, geralmente vendido em par, que reproduz músicas e vídeos em volume alto para todo o ambiente."),
  q("x-anexo", "X", "contains", "internet", "Anexo", ["anexo", "anexos"],
    "Arquivo enviado junto com uma mensagem de e-mail."),

  q("y-youtube", "Y", "starts", "internet", "YouTube", ["youtube"],
    "Plataforma de vídeos do Google onde as pessoas assistem, publicam e comentam vídeos."),
  q("y-spyware", "Y", "contains", "software", "Spyware", ["spyware", "spywares"],
    "Programa espião que coleta informações do usuário, como senhas e sites visitados, sem que ele perceba."),
  q("y-display", "Y", "contains", "hardware", "Display", ["display", "displays"],
    "Palavra em inglês para a tela ou o visor de um aparelho, como a de um celular, de um relógio ou de uma calculadora."),

  q("z-zip", "Z", "starts", "software", "ZIP", ["zip"],
    "Formato de arquivo compactado que junta vários arquivos em um só e diminui o seu tamanho."),
  q("z-zoom", "Z", "starts", "software", "Zoom", ["zoom"],
    "Recurso que aproxima ou afasta a visualização de uma imagem, de um mapa ou de uma página."),
  q("z-atualizacao", "Z", "contains", "software", "Atualização", ["atualizacao", "atualizacoes"],
    "Nova versão de um programa ou sistema que corrige falhas, melhora a segurança e traz novidades.")
];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((x) => [x.id, x]));
