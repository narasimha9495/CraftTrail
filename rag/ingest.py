"""
ingest.py — CraftTrail RAG Knowledge Ingestion
================================================
Loads ALL data sources into ChromaDB vector store:
  1. Built-in state/craft knowledge (states.json)
  2. Artisan profiles from MongoDB
  3. Any PDF / CSV / TXT files dropped into ./data/
  4. Government cluster data

Run:  python ingest.py
Re-run any time you add new files to ./data/
"""

import os, json, glob, sys, csv, io
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ── Config ────────────────────────────────────────────────────────────
CHROMA_PATH   = os.getenv("CHROMA_DB_PATH", "./chroma_db")
MONGO_URI     = os.getenv("MONGO_URI", "mongodb://localhost:27017/crafttrail")
DATA_DIR      = Path(__file__).parent / "data"
COLLECTION    = "crafttrail_knowledge"

# DefaultEmbeddingFunction uses all-MiniLM-L6-v2 via ONNX runtime
# Same model quality as SentenceTransformers but ~3x less memory
embedding_fn = DefaultEmbeddingFunction()

client     = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(
    name=COLLECTION,
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"},
)

splitter = RecursiveCharacterTextSplitter(
    chunk_size=600,
    chunk_overlap=80,
    separators=["\n\n", "\n", ".", "!", "?", " "],
)


def add_chunks(texts: list[str], ids_prefix: str, meta: dict = {}):
    """Embed and insert a list of text chunks into ChromaDB."""
    if not texts:
        return 0
    ids   = [f"{ids_prefix}_{i}" for i in range(len(texts))]
    metas = [meta] * len(texts)
    # Upsert so re-running doesn't duplicate
    collection.upsert(documents=texts, ids=ids, metadatas=metas)
    return len(texts)


# ── 1. Built-in state knowledge (verified & corrected for all 30 states) ──
STATE_KNOWLEDGE = {
    "Telangana": {
        "crafts": ["Pochampally Ikat Sarees", "Gadwal Sarees", "Nirmal Paintings & Toys", "Pembarthi Metal Craft", "Warangal Durries"],
        "culture": "Rich Deccan heritage blending Telugu and Urdu traditions. Famous for Kuchipudi dance, Perini Shivatandavam, and Bonalu festivals. Hyderabad is the gateway to Telangana's crafts.",
        "products": ["Pochampally Ikat silk & cotton sarees — Telangana's most famous craft", "Gadwal silk-cotton sarees with kuttu borders", "Nirmal lacquered furniture, toys & paintings", "Pembarthi brass sheet metal craft", "Warangal cotton durrie rugs"],
        "gi": ["Pochampally Ikat", "Gadwal Sarees", "Nirmal Toys", "Warangal Durries", "Silver Filigree of Karimnagar"],
        "clusters": ["Pochampally (Bhoodan Pochampally) — just 50km from Hyderabad, UN-recognised Best Tourism Village", "Gadwal — 180km from Hyderabad, famous for kuttu border sarees", "Nirmal — 300km north of Hyderabad, lacquerware hub", "Karimnagar — silver filigree work", "Warangal — durrie weaving tradition"],
        "history": "Pochampally Ikat is Telangana's signature craft, practiced for over 500 years. The warp and weft yarns are resist-dyed before weaving so the pattern exists in the thread. A single Pochampally Ikat saree requires over 5,000 individual thread-tie-and-dye operations. Pochampally village has 5,000+ active looms.",
        "visit": "For visitors to Hyderabad: Pochampally village (50km away, 1-hour drive) is a must — it has a Handloom Park where you can watch Ikat weaving live. Best visited October–March. The village was recognised as a UN Best Tourism Village.",
    },
    "Andhra Pradesh": {
        "crafts": ["Kalamkari", "Kondapalli Toys", "Etikoppaka Lacquerware", "Dharmavaram Silk", "Uppada Jamdani", "Mangalagiri Cotton"],
        "culture": "Ancient Satavahana and Vijayanagara heritage. Home of Kuchipudi dance, Harikatha storytelling, and Tirupati temple.",
        "products": ["Kalamkari cotton & silk fabrics — hand-painted or block-printed", "Kondapalli painted wooden toys (softwood Tella Poniki)", "Etikoppaka lacquered wooden toys using natural dyes", "Dharmavaram silk pattu sarees", "Mangalagiri cotton Nizam border sarees"],
        "gi": ["Kalamkari (Srikalahasti & Machilipatnam)", "Kondapalli Toys", "Etikoppaka Toys", "Dharmavaram Silk", "Uppada Jamdani", "Mangalagiri Sarees"],
        "clusters": ["Sri Kalahasti — hand-painted Kalamkari, near Tirupati", "Machilipatnam — block-printed Kalamkari", "Kondapalli near Vijayawada — toy making", "Etikoppaka near Rajahmundry — lacquerware"],
        "history": "Kalamkari (kalam=pen, kari=work) is a 3000-year-old art. Sri Kalahasti style uses hand painting with natural dyes, Machilipatnam uses block printing. Kondapalli toys are carved from Tella Poniki softwood and painted with enamel colours.",
        "visit": "Sri Kalahasti near Tirupati for Kalamkari workshops. Kondapalli fort village near Vijayawada welcomes visitors.",
    },
    "Rajasthan": {
        "crafts": ["Bagru Block Printing", "Sanganeri Printing", "Blue Pottery", "Bandhani Tie-Dye", "Miniature Painting", "Thewa Jewellery", "Lac Bangles", "Marble Carving"],
        "culture": "Royal Rajput heritage. Famous for Ghoomar dance, Kalbeliya dance (UNESCO), Pushkar fair, and colourful festivals. Painted havelis and desert forts.",
        "products": ["Bagru hand-block printed fabrics with natural indigo dyes", "Jaipur Blue Pottery vases and tiles", "Bandhani tie-dye textiles (Jodhpur, Jaipur)", "Thewa gold-on-glass jewellery of Pratapgarh", "Jaipur gemstone cutting & jewellery"],
        "gi": ["Jaipur Blue Pottery", "Kota Doria Saree", "Bagru Hand Block Print", "Thewa Art of Pratapgarh", "Molela Clay Work"],
        "clusters": ["Bagru — 30km from Jaipur, block printing village", "Sanganer — 16km from Jaipur, paper & printing", "Nathdwara for Pichwai paintings", "Pratapgarh for Thewa jewellery", "Jodhpur for Bandhani"],
        "history": "Bagru has been printing cloth using natural indigo and alizarin for 300+ years. Jaipur Blue Pottery is unique — made from quartz powder, not clay, using a Persian technique. Thewa involves fusing 23-carat gold sheets on glass.",
        "visit": "Bagru village year-round. Sanganer on Saraswati river banks. Best: October–February.",
    },
    "Gujarat": {
        "crafts": ["Patan Patola", "Bandhani", "Kutch Embroidery", "Rogan Art", "Ajrakh Block Printing"],
        "culture": "Garba and Dandiya Raas dances. Navratri world's largest dance festival. Rann Utsav white desert festival. International Kite Festival.",
        "products": ["Patan Patola double-Ikat silk sarees (Rs 1-5 lakhs each)", "Kutch mirror-work embroidery (16+ regional styles)", "Bandhani tie-dye fabrics from Jamnagar", "Ajrakh block-printed cloth with natural dyes", "Rogan oil-painted fabric from Nirona"],
        "gi": ["Patan Patola", "Kutch Embroidery", "Surat Zari Craft", "Tangaliya Shawl"],
        "clusters": ["Patan — 130km from Ahmedabad, Patola weaving", "Bhuj — centre of Kutch crafts", "Jamnagar for Bandhani tie-dye", "Ajrakhpur near Bhuj for Ajrakh printing", "Nirona village for Rogan art (single family)"],
        "history": "Only 3 families in the world know the Patan Patola double Ikat technique. A single saree takes 6-12 months. Kutch embroidery has 16+ distinct regional styles including Rabari, Ahir, and Jat. Rogan art — only one family (the Khatris of Nirona) still practises it.",
        "visit": "Bhuj for Kutch villages. Nirona for Rogan art — watch Abdul Gafur Khatri work. Best: October–February (Rann Utsav season).",
    },
    "Karnataka": {
        "crafts": ["Mysore Silk", "Channapatna Toys", "Bidriware", "Ilkal Sarees", "Rosewood Inlay", "Kinhal Toys"],
        "culture": "Carnatic music, Yakshagana theatre, Mysuru Dasara festival. UNESCO-listed Hampi ruins. Coffee plantations of Coorg.",
        "products": ["Mysore pure silk sarees with gold zari (KSIC)", "Channapatna lacquered wooden toys (GI tagged)", "Bidriware silver-inlaid metal craft from Bidar", "Ilkal sarees with distinctive pallu join (tope teni)", "Rosewood inlay furniture from Mysuru"],
        "gi": ["Mysore Silk", "Channapatna Toys", "Bidriware of Bidar", "Ilkal Sarees", "Kinhal Toys", "Navalgund Durries"],
        "clusters": ["Channapatna — 60km south of Bengaluru, toy capital", "Mysuru — KSIC silk factory and rosewood artisans", "Bidar — Bidriware silver inlay on black metal (unique to Bidar, Karnataka)", "Ilkal — handloom saree town in Bagalkot district"],
        "history": "Bidriware originated in Bidar, Karnataka — named after the city. Silver wire is inlaid into a blackened zinc-copper alloy. Channapatna toys were popularised by Tipu Sultan who invited Persian artisans. Mysore silk was patronised by the Wodeyar dynasty.",
        "visit": "Channapatna workshops welcome visitors (1 hour from Bengaluru). KSIC Silk Factory in Mysuru gives guided tours. Bidar — 700km north of Bengaluru.",
    },
    "Tamil Nadu": {
        "crafts": ["Kanchipuram Silk", "Swamimalai Bronze Casting", "Thanjavur Paintings", "Chettinad Pottery", "Palmyra Crafts", "Korai Grass Mats"],
        "culture": "Bharatanatyam dance, Carnatic music, Dravidian temple architecture 2000+ years old. Grand temples at Madurai, Thanjavur, Chidambaram.",
        "products": ["Kanchipuram pure mulberry silk sarees (1200+ threads per inch)", "Panchaloha bronze Nataraja statues (lost-wax casting)", "Thanjavur gold-leaf tanjore paintings", "Korai grass mats from Pattamadai"],
        "gi": ["Kanchipuram Silk", "Thanjavur Paintings", "Swamimalai Bronze Icons", "Thanjavur Art Plate", "Pattamadai Pai (mat)"],
        "clusters": ["Kanchipuram — 70km from Chennai, silk capital", "Swamimalai near Kumbakonam — bronze casting", "Thanjavur city — paintings and art plates"],
        "history": "Kanchipuram silk has over 1200 threads per inch — the densest weave in India. Swamimalai lost-wax (cire perdue) casting follows 1000-year-old Chola techniques. 65+ generations of Sthapathis — the knowledge transmitted orally.",
        "visit": "Kanchipuram Weavers Colony open to visitors. Swamimalai bronze workshops on the main road. Best: October–March.",
    },
    "West Bengal": {
        "crafts": ["Kantha Embroidery", "Bishnupur Terracotta", "Baluchari Silk", "Dhokra Metal Casting", "Shola Pith Craft"],
        "culture": "Rabindranath Tagore, Bengal Renaissance, Durga Puja (UNESCO Intangible Heritage). Baul music tradition. Jatra folk theatre.",
        "products": ["Kantha quilts & embroidered sarees — recycled fabric art", "Bishnupur terracotta panels and jewellery", "Baluchari silk sarees with woven mythological stories", "Dhokra lost-wax metal figurines", "Shola pith flower decorations for weddings"],
        "gi": ["Baluchari Saree", "Dhaniakhali Saree", "Shantipur Saree", "Darjeeling Tea"],
        "clusters": ["Shantiniketan — Kantha & Batik craft market", "Bishnupur — 200km from Kolkata, terracotta temples", "Murshidabad — silk & Kantha weaving", "Bankura — Dhokra metal casting"],
        "history": "Kantha literally means rags. It began as women recycling old sarees into quilts for babies — each stitch tells a story. Bishnupur was the seat of Malla kings famous for terracotta temples. Baluchari sarees depict scenes from Ramayana and Mahabharata.",
        "visit": "Shantiniketan has vibrant craft market (especially during Poush Mela in December). Bishnupur terracotta temples open daily. Best: October–February.",
    },
    "Odisha": {
        "crafts": ["Pattachitra", "Sambalpuri Ikat", "Dhokra Metal", "Pipli Appliqué", "Silver Filigree (Tarakasi)", "Stone Carving"],
        "culture": "Odissi classical dance, Rath Yatra festival at Puri, Konark Sun Temple (UNESCO). 62 tribal communities each with distinct craft traditions.",
        "products": ["Pattachitra paintings on cloth & palm leaf (mythological narratives)", "Sambalpuri silk Ikat sarees — tie-dye weaving", "Dhokra tribal metal figurines", "Pipli appliqué umbrellas & bags", "Cuttack silver filigree (tarakasi) jewellery"],
        "gi": ["Pattachitra", "Sambalpuri Saree", "Pipli Appliqué", "Odisha Ikat", "Cuttack Silver Filigree"],
        "clusters": ["Raghurajpur Heritage Village — 14km from Puri, every family is an artist", "Sambalpur for Ikat weaving", "Pipli — 35km from Bhubaneswar, appliqué village", "Cuttack — silver filigree capital of India"],
        "history": "Raghurajpur is India's first Heritage Craft Village — every family is an artist. Children learn Pattachitra before they learn to write. Cuttack's silver filigree (tarakasi) involves twisting silver wires into delicate jewellery — a 500-year tradition.",
        "visit": "Raghurajpur open daily, 14km from Puri — India's most accessible craft village. Cuttack Chandi Bazaar for filigree shopping.",
    },
    "Uttar Pradesh": {
        "crafts": ["Banarasi Silk", "Chikankari", "Zardozi", "Moradabad Brassware", "Carpet Weaving", "Glass Bangles (Firozabad)"],
        "culture": "Varanasi ghats, Mughal grandeur, Lucknow Nawabi tehzeeb. Kathak dance, Banarasi classical music.",
        "products": ["Banarasi silk brocade sarees with gold zari", "Lucknow Chikankari embroidered kurtas & sarees", "Zardozi gold thread embroidery", "Moradabad brassware — brass city of India", "Bhadohi hand-knotted carpets", "Firozabad glass bangles"],
        "gi": ["Banarasi Brocades & Sarees", "Lucknow Chikankari", "Bhadohi Carpet", "Lucknow Zardozi"],
        "clusters": ["Varanasi — Madanpura area for silk weaving", "Lucknow — Chowk & Hazratganj for Chikankari", "Bhadohi — Carpet City 65km from Varanasi", "Moradabad — Peetal Nagri (Brass City)", "Firozabad — glass bangle capital"],
        "history": "Banarasi silk weaving dates to the Mughal era. Finest Kadwa brocade takes 6 months for one saree. Chikankari has 32 types of stitches — tradition says it was introduced by Mughal Empress Noor Jahan.",
        "visit": "Varanasi silk weavers in narrow lanes near Madanpura. Lucknow's Chowk area for Chikankari. Best: October–March.",
    },
    "Madhya Pradesh": {
        "crafts": ["Chanderi Silk", "Maheshwari Sarees", "Gond Tribal Art", "Bagh Block Printing", "Dhokra Metal"],
        "culture": "Khajuraho temples (UNESCO), Sanchi Stupa (UNESCO), Gond tribal culture. Sacred Narmada river. Malwa and Bundeli heritage.",
        "products": ["Chanderi silk-cotton lightweight sarees — called 'woven air'", "Maheshwari silk-cotton sarees with reversible borders", "Gond paintings — dot-work tribal art with vibrant colours", "Bagh block-printed cloth with natural vegetable dyes"],
        "gi": ["Chanderi Saree", "Maheshwari Saree", "Bagh Print", "Bell Metal Ware of Datia"],
        "clusters": ["Chanderi — 220km from Bhopal, heritage weaving town", "Maheshwar — on Narmada river banks, Ahilyabai's legacy", "Bagh village — near Dhar, natural dye block printing"],
        "history": "Chanderi fabric is so fine it is called 'woven air' — a 6-yard saree can pass through a finger ring. Maheshwari weaving was revived by Queen Ahilyabai Holkar in the 18th century. Bagh prints use only natural dyes.",
        "visit": "Maheshwar is a stunning heritage town on Narmada. Weavers work in riverside workshops under Ahilyabai's fort.",
    },
    "Bihar": {
        "crafts": ["Madhubani Painting", "Sikki Grass Craft", "Sujni Embroidery", "Manjusha Art", "Tikuli Art"],
        "culture": "Birthplace of Buddhism (Bodh Gaya) and Jainism (Vaishali). Nalanda — world's first university. Chhath Puja sun worship. Maithili culture.",
        "products": ["Madhubani paintings on paper, silk & canvas — geometric & mythological", "Sikki golden grass dolls & baskets", "Sujni embroidered quilts", "Tikuli glass art of Patna"],
        "gi": ["Madhubani Painting", "Sujni Embroidery"],
        "clusters": ["Jitwarpur village — 25km from Madhubani town", "Ranti village for Madhubani painting", "Bhagalpur for Manjusha art & Tussar silk"],
        "history": "Madhubani painting was discovered by British officer William Archer after the 1934 earthquake when he saw painted mud walls. Traditionally painted by women using natural dyes.",
        "visit": "Jitwarpur and Ranti villages — every home is a studio. Madhubani Railway Station walls are entirely painted.",
    },
    "Assam": {
        "crafts": ["Muga Silk", "Eri Peace Silk", "Mekhela Chador", "Cane & Bamboo Craft", "Bell Metal Craft"],
        "culture": "Bihu festival three times a year. Sattriya classical dance. Brahmaputra river. One-horned rhinos of Kaziranga. Tea culture.",
        "products": ["Muga silk sarees — world's only naturally golden silk", "Eri peace silk (non-violent extraction)", "Mekhela chador two-piece silk ensemble", "Bell metal utensils from Sarthebari"],
        "gi": ["Muga Silk of Assam", "Assam Orthodox Tea"],
        "clusters": ["Sualkuchi — 'Manchester of Assam', 35km from Guwahati, silk weaving", "Sarthebari — bell metal craft capital", "Majuli island — world's largest river island, mask & bamboo crafts"],
        "history": "Muga silk is the only naturally golden silk in the world. Produced exclusively in Assam from Antheraea assamensis silkworm. Gets more lustrous with age — can last 100+ years. Eri silk is called 'peace silk' because the moth emerges before processing.",
        "visit": "Sualkuchi is one long weaving street — every house has a loom. Majuli island accessible by ferry from Jorhat.",
    },
    "Kerala": {
        "crafts": ["Coir Weaving", "Aranmula Metal Mirror (Kannadi)", "Kasavu Sarees", "Nettipattam (Caparison)", "Wood Carving"],
        "culture": "Onam harvest festival, Kathakali dance-drama, Mohiniyattam dance, Kalaripayattu martial art. Backwaters and spice trade heritage. God's Own Country.",
        "products": ["Coir door mats, rugs & rope", "Aranmula Kannadi — unique metal mirrors without glass", "Kasavu off-white & gold sarees (Kerala mundu)", "Nettipattam decorative elephant caparisons"],
        "gi": ["Aranmula Kannadi", "Alleppey Coir", "Kasaragod Saree", "Screw Pine Craft of Kerala"],
        "clusters": ["Aranmula near Pathanamthitta — metal mirror artisans", "Chendamangalam — kasavu handloom weaving", "Alleppey (Alappuzha) — coir capital of India"],
        "history": "Aranmula Kannadi is made from a secret copper-tin alloy known only to a few families. Unlike glass mirrors, it reflects without distortion and never tarnishes.",
        "visit": "Aranmula 20km from Changanacherry. Chendamangalam Weaving Cooperative near Kochi. Best: September–February.",
    },
    "Jammu & Kashmir": {
        "crafts": ["Pashmina Shawl", "Papier-Mâché", "Kashmiri Carpet", "Sozni (Kashida) Embroidery", "Walnut Wood Carving", "Khatamband Ceiling"],
        "culture": "Himalayan and Central Asian confluence. Sufi music, Rouf dance, Shikara culture on Dal Lake. Mughal gardens of Srinagar.",
        "products": ["Hand-spun Pashmina shawls from Changra goat wool (Ladakh)", "Papier-mâché lacquered boxes & decoratives", "Hand-knotted Kashmiri silk & wool carpets (600+ knots/sq inch)", "Sozni embroidered shawls", "Walnut wood carved furniture"],
        "gi": ["Kashmir Pashmina", "Kashmir Sozni Embroidery", "Kashmir Walnut Wood Carving", "Kani Shawl"],
        "clusters": ["Srinagar — Dal Lake area, old city workshops for most crafts", "Kanihama — Kani shawl weaving on special looms", "Leh — Pashmina raw material sourcing from Changra goats"],
        "history": "Pashmina comes from the Changra goat of Ladakh at 4000m altitude. The goat sheds its undercoat naturally in spring — it is combed, not sheared. A single Kani shawl takes 2-3 years. Kashmiri carpets can have 600+ knots per square inch.",
        "visit": "Srinagar old city workshops open to walk in. Craft Development Institute at Nowhatta. Best: May–September.",
    },
    "Punjab": {
        "crafts": ["Phulkari Embroidery", "Punjabi Jutti", "Durrie Weaving", "Brass Inlay Work", "Crochet Craft"],
        "culture": "Bhangra and Giddha folk dances. Golden Temple in Amritsar. Lohri, Baisakhi festivals. Sufi music tradition.",
        "products": ["Phulkari floral embroidery on hand-spun cotton (Bagh covers entire fabric)", "Handcrafted Punjabi leather juttis with thread work", "Amritsar shawls and stoles", "Durri flat-weave cotton rugs"],
        "gi": ["Phulkari"],
        "clusters": ["Patiala — Phulkari & Jutti capital", "Amritsar — Hall Bazaar for shawls and handicrafts", "Ludhiana — hosiery and textile hub"],
        "history": "Phulkari (flower work) was made by Punjabi women for trousseau. Bagh style covers the base fabric completely with thread. A Bagh trousseau could take 3 years to complete.",
        "visit": "Patiala old city bazaars. Amritsar Hall Bazaar near Golden Temple.",
    },
    "Himachal Pradesh": {
        "crafts": ["Kullu Shawls", "Chamba Rumal", "Kangra Miniature Painting", "Kinnauri Caps & Shawls", "Thangka Painting"],
        "culture": "Snow-capped Himalayan peaks, apple orchards, deodar forests. Hindu and Buddhist traditions. Kullu Dussehra brings 200+ local deities. Himachali Nati dance.",
        "products": ["Kullu shawls with geometric patterns in pure wool", "Chamba Rumal — double-sided embroidery on cloth", "Kangra miniature paintings with natural pigments", "Kinnauri hand-woven caps and shawls"],
        "gi": ["Kullu Shawl", "Chamba Rumal", "Kangra Painting"],
        "clusters": ["Kullu Valley — shawl weaving centre", "Chamba town — Rumal embroidery", "Kangra — miniature painting tradition", "Dharamsala (McLeod Ganj) — Tibetan Thangka paintings"],
        "history": "Chamba Rumal has double-sided embroidery — both faces look identical with no wrong side. Takes decades to master. Kullu shawls woven from Angora rabbit and local sheep wool on pit looms.",
        "visit": "Kullu town has government craft emporium. Chamba is 120km from Pathankot. Dharamsala for Tibetan crafts.",
    },
    "Maharashtra": {
        "crafts": ["Paithani Sarees", "Warli Painting", "Kolhapuri Chappals", "Sawantwadi Lacquerware", "Mashru Weaving"],
        "culture": "Maratha warrior heritage. Ganesh Chaturthi — largest public festival. Lavani folk dance. Ajanta & Ellora caves (UNESCO). Bollywood capital Mumbai.",
        "products": ["Paithani silk sarees with gold-zari peacock motifs", "Warli tribal paintings — geometric stick figures on mud walls", "Kolhapuri hand-stitched leather chappals", "Sawantwadi painted wooden toys"],
        "gi": ["Paithani Saree", "Kolhapuri Chappal", "Warli Painting", "Puneri Pagdi"],
        "clusters": ["Paithan near Aurangabad — Paithani silk weaving", "Dahanu & Talasari — Warli tribal villages (Thane)", "Kolhapur — leather chappal workshops", "Sawantwadi — lacquerware and Ganjifa cards"],
        "history": "Paithani sarees date back 2000 years to the Satavahana dynasty. Pallu has iconic peacock (mor) motif in pure gold zari. Warli painting is 5000-year-old tribal art. Kolhapuri chappals are hand-stitched with vegetable-tanned leather.",
        "visit": "Paithan town — 50km from Aurangabad. Dahanu for Warli villages — 150km from Mumbai. Kolhapur's Mahadwar Road for chappal workshops.",
    },
    "Uttarakhand": {
        "crafts": ["Aipan Painting", "Ringaal Bamboo Craft", "Tamta Copper Ware", "Wool Weaving", "Wood Carving"],
        "culture": "Land of temples — Char Dham (Badrinath, Kedarnath, Gangotri, Yamunotri). Garhwali and Kumaoni hill cultures. Rishikesh yoga capital.",
        "products": ["Aipan ritual geometric paintings on red ochre base", "Ringaal woven bamboo baskets & utility items", "Tamta hand-hammered copper vessels", "Handwoven woollen shawls and blankets"],
        "gi": ["Uttarakhand Ringaal Craft"],
        "clusters": ["Almora — Aipan painting and copper ware", "Champawat — Ringaal bamboo craft", "Pithoragarh — wool weaving"],
        "history": "Aipan is a traditional Kumaoni floor and wall art using rice paste on red ochre background. Geometric patterns represent deities and are drawn during festivals and weddings.",
        "visit": "Almora bazaar for copper ware and Aipan crafts. Champawat for bamboo craft demonstrations.",
    },
    "Jharkhand": {
        "crafts": ["Paitkar Painting", "Bamboo Craft", "Dokra Metal Casting", "Stone Carving", "Tussar Silk"],
        "culture": "Tribal heartland — Santhal, Munda, Ho, Oraon tribes. Chhau dance (UNESCO). Sarhul spring festival. Rich in minerals and forests.",
        "products": ["Paitkar scroll paintings on cloth (tribal narratives)", "Bamboo baskets and furniture", "Dokra metal tribal figurines", "Tussar (Kosa) silk from wild silkworms"],
        "gi": ["Sohrai-Khovar Painting"],
        "clusters": ["Amadubi village near Jamshedpur — Paitkar painting", "Dumka — Santhal tribal crafts", "Ranchi — bamboo and metal craft hub"],
        "history": "Paitkar is one of the oldest scroll painting traditions of India, practiced by Chitrakars of Jharkhand. Sohrai-Khovar are tribal wall paintings made during harvest and weddings.",
        "visit": "Amadubi village near Jamshedpur for Paitkar paintings. Tribal craft haats (weekly markets) in Ranchi.",
    },
    "Chhattisgarh": {
        "crafts": ["Kosa (Tussar) Silk", "Dhokra Metal Casting", "Bamboo Craft", "Bell Metal Ware", "Godna Tribal Tattoo Art"],
        "culture": "Tribal heritage — Gond, Baiga, Muria tribes. Bastar Dussehra — world's longest festival (75 days). Chitrakote Falls — India's Niagara.",
        "products": ["Kosa (Tussar) silk sarees — natural golden sheen", "Bastar Dhokra lost-wax metal figurines", "Bamboo furniture and utility crafts", "Bell metal tribal jewellery"],
        "gi": ["Bastar Dhokra", "Bastar Iron Craft", "Bastar Wooden Craft"],
        "clusters": ["Champa — Kosa silk weaving capital", "Kondagaon — Dhokra and bell metal craft (Bastar)", "Jagdalpur — tribal craft centre"],
        "history": "Bastar's Dhokra is one of the oldest metal casting techniques in the world (4000+ years old). Each piece is unique — the wax mould is destroyed after casting. Kosa silk comes from wild silkworms.",
        "visit": "Kondagaon craft village in Bastar. Champa town for silk workshops. Best during Bastar Dussehra (October).",
    },
    "Tripura": {
        "crafts": ["Risa & Rignai Handloom", "Bamboo & Cane Craft", "Clay Pottery", "Tribal Textile Weaving"],
        "culture": "19 tribal communities including Tripuri, Reang, Jamatia. Garia Puja, Kharchi festivals. Ujjayanta Palace heritage.",
        "products": ["Risa-Rignai handwoven tribal textiles", "Bamboo and cane baskets, furniture, decoratives", "Tribal pottery with geometric designs"],
        "gi": [],
        "clusters": ["Agartala — handloom and handicraft centre", "Kailashahar — bamboo craft hub"],
        "history": "Tripura's 19 tribal communities each have distinct weaving patterns. The Risa (upper garment) and Rignai (lower wrap) are iconic Tripuri handloom textiles with geometric motifs.",
        "visit": "Purbasha (Government Craft Emporium) in Agartala for authentic tribal crafts.",
    },
    "Manipur": {
        "crafts": ["Moirang Phee Handloom", "Kouna (Water Reed) Craft", "Bamboo & Cane Craft", "Longpi Black Pottery"],
        "culture": "Manipuri (Raas Leela) classical dance. Polo originated here. Sangai deer festival. Loktak floating lake.",
        "products": ["Moirang Phee traditional Meitei textiles", "Kouna (water reed) mats and bags", "Longpi black stone pottery (Naga tribe)", "Bamboo & cane furniture"],
        "gi": ["Manipur Longpi Pottery"],
        "clusters": ["Imphal — handloom weaving, Ima Keithel (Asia's largest all-women market)", "Longpi village in Ukhrul — black pottery", "Moirang — traditional textile weaving"],
        "history": "Longpi pottery is unique — made without a potter's wheel using serpentine rock and special clay by the Tangkhul Naga tribe. Ima Keithel in Imphal is Asia's largest all-women market.",
        "visit": "Ima Keithel in Imphal — all-women market for handlooms. Longpi village in Ukhrul district for pottery.",
    },
    "Meghalaya": {
        "crafts": ["Cane & Bamboo Craft", "Handloom Weaving (Eri Silk)", "Wood Carving", "Knup (Cane Umbrella)"],
        "culture": "Living Root Bridges (UNESCO candidate). Khasi, Garo, Jaintia tribes. Matrilineal society. Wettest place on earth (Cherrapunji).",
        "products": ["Cane baskets, trays and furniture", "Eri silk shawls and fabrics", "Knup — traditional cane rain umbrella", "Bamboo musical instruments"],
        "gi": ["Meghalaya Lakadong Turmeric"],
        "clusters": ["Shillong — craft bazaars and handloom centres", "Tura — Garo hills bamboo craft"],
        "history": "The Knup is a hand-woven cane rain shield unique to Meghalaya, used by Khasi people for centuries. Living root bridges are bio-engineered over decades by tribal communities.",
        "visit": "Shillong's Police Bazaar and Bara Bazaar for tribal crafts. Mawlynnong (Asia's cleanest village) has bamboo craft.",
    },
    "Nagaland": {
        "crafts": ["Naga Shawl Weaving", "Bamboo Craft", "Wood Carving", "Beadwork & Jewellery", "Pottery"],
        "culture": "Land of festivals — Hornbill Festival (December). 17 major tribes each with distinct identity. Dzükou Valley lilies.",
        "products": ["Angami, Ao, and Lotha tribal shawls with distinctive motifs", "Bamboo mugs, baskets and furniture", "Carved wooden warrior figures", "Multi-coloured bead necklaces"],
        "gi": ["Naga Mircha (King Chilli)"],
        "clusters": ["Kohima — tribal craft market", "Dimapur — craft bazaars", "Tuensang — traditional Konyak craft"],
        "history": "Each Naga tribe has unique shawl patterns — the design tells the wearer's tribe, status and achievements. Warriors' shawls have specific motifs earned through acts of valour.",
        "visit": "Hornbill Festival in Kisama (December) — best showcase of all Naga tribal crafts. Kohima's local market.",
    },
    "Mizoram": {
        "crafts": ["Puan (Mizo Shawl Weaving)", "Bamboo & Cane Craft", "Mizo Embroidery", "Basketry"],
        "culture": "Cheraw bamboo dance (most famous dance of Mizoram). Chapchar Kut spring festival. 100% literate state.",
        "products": ["Puan — colourful handwoven Mizo shawls and wraps", "Bamboo and cane baskets, hats, furniture", "Embroidered bags and textiles"],
        "gi": ["Mizo Puanchei"],
        "clusters": ["Aizawl — Luangmual Handicraft Centre", "Thenzawl — handloom weaving village"],
        "history": "The Puanchei is the most prized Mizo shawl — worn by women during festivals. Every Mizo girl learns to weave on a traditional backstrap loom.",
        "visit": "Luangmual Handicraft Centre in Aizawl. Thenzawl weaving village — 90km from Aizawl.",
    },
    "Arunachal Pradesh": {
        "crafts": ["Handloom Weaving", "Bamboo & Cane Craft", "Carpet Weaving (Monpa)", "Wood Carving", "Bead Craft"],
        "culture": "26 major tribes and 100+ sub-tribes. Tawang Monastery — largest in India. Ziro Music Festival. Adi, Apatani, Monpa, Nyishi traditions.",
        "products": ["Tribal handwoven textiles with geometric patterns", "Bamboo hats, baskets and utility items", "Monpa woollen carpets with Buddhist motifs", "Wooden masks and carved panels"],
        "gi": ["Arunachal Orange"],
        "clusters": ["Tawang — Monpa carpet and mask making", "Ziro — Apatani tribal crafts", "Pasighat — Adi tribal weaving"],
        "history": "Arunachal's 26 tribes each have distinct weaving patterns. Apatani tribe women were known for their facial tattoos. Monpa carpets feature Buddhist symbols woven using yak wool.",
        "visit": "Tawang monastery and craft shops. Ziro festival area for Apatani crafts. Craft Centre in Itanagar.",
    },
    "Sikkim": {
        "crafts": ["Thangka Painting", "Handloom Weaving", "Bamboo & Cane Craft", "Lepcha Weaving", "Wood Carving"],
        "culture": "Buddhist monasteries, Tibetan influence, Lepcha indigenous culture. Kanchenjunga — world's third highest peak. Organic farming state.",
        "products": ["Thangka Buddhist scroll paintings on silk", "Lepcha handwoven fabrics", "Bamboo containers and furniture", "Carved wooden masks for monastery dances"],
        "gi": ["Sikkim Large Cardamom"],
        "clusters": ["Gangtok — Thangka painting workshops", "Ravangla — traditional craft centre", "Namchi — Lepcha weaving"],
        "history": "Thangka painting is a Buddhist meditative art — each painting follows strict iconographic rules passed down through monasteries.",
        "visit": "Gangtok Directorate of Handicrafts. Rumtek Monastery for Thangka art. Best: March–June, September–November.",
    },
    "Delhi": {
        "crafts": ["Zardozi Embroidery", "Meenakari Jewellery", "Block Printing", "Handloom Durries"],
        "culture": "Capital city — Mughal heritage, Red Fort (UNESCO), Qutub Minar, India Gate. Dilli Haat permanent craft bazaar. Multi-cultural hub.",
        "products": ["Zardozi gold/silver embroidered wedding wear", "Meenakari enamelled jewellery", "Block-printed fabrics", "Handwoven durrie rugs"],
        "gi": [],
        "clusters": ["Old Delhi Chandni Chowk — Zardozi artisans", "Dilli Haat — permanent craft market with artisans from all states", "Shahpur Jat — designer craft workshops"],
        "history": "Delhi's craft tradition is rooted in Mughal patronage. Zardozi artisans in Chandni Chowk have been embroidering with gold/silver thread for 500+ years. Dilli Haat gives artisans from across India a permanent marketplace.",
        "visit": "Dilli Haat, INA — best place to see crafts from ALL Indian states in one place. Chandni Chowk lanes for Zardozi.",
    },
    "Haryana": {
        "crafts": ["Phulkari Embroidery", "Panipat Durries & Carpets", "Clay Pottery", "Tilla Jutti", "Saanjhi Paper Cutting"],
        "culture": "Land of Mahabharata — Kurukshetra battlefield. Surajkund Crafts Mela — India's largest annual craft fair. Haryanvi folk songs.",
        "products": ["Panipat handwoven durries and carpets — 'City of Weavers'", "Tilla jutti embroidered footwear", "Clay pottery and terracotta", "Saanjhi paper-cut stencil art"],
        "gi": [],
        "clusters": ["Panipat — durrie and carpet weaving capital", "Surajkund — annual international crafts mela", "Kurukshetra — traditional pottery"],
        "history": "Panipat is called the 'City of Weavers' — it recycles textile waste into handwoven durries and blankets. Surajkund International Crafts Mela (February) is India's largest craft fair.",
        "visit": "Surajkund Crafts Mela in February — 2 weeks, 20+ countries. Panipat town for durrie workshops.",
    },
    "Goa": {
        "crafts": ["Kunbi Weaving", "Terracotta", "Crochet Craft", "Coconut Shell Craft", "Azulejos Tile Art"],
        "culture": "Portuguese colonial heritage. Churches of Old Goa (UNESCO). Carnival festival. Feni spirit from cashew/coconut.",
        "products": ["Kunbi handwoven cotton sarees with checks", "Terracotta lamps, figurines and tiles", "Crochet lace tablecloths", "Coconut shell decoratives"],
        "gi": ["Goan Feni", "Goa Mankurad Mango"],
        "clusters": ["Old Goa — craft markets near churches", "Mapusa market — traditional crafts", "Aldona — Kunbi weaving village"],
        "history": "Kunbi is Goa's indigenous handloom tradition, worn by the Kunbi tribal community. Portuguese influence brought crochet and Azulejos tile art, creating a unique Indo-Portuguese craft heritage.",
        "visit": "Mapusa Friday Market for local crafts. Fontainhas Latin Quarter in Panaji for tile art.",
    },
    "Chandigarh": {
        "crafts": ["Phulkari Embroidery", "Jutti Making", "Block Printing", "Pottery"],
        "culture": "Le Corbusier planned city. Rock Garden — Nek Chand's recycled art. Rose Garden. Union Territory shared by Punjab and Haryana.",
        "products": ["Phulkari embroidered stoles and dupattas", "Handcrafted leather juttis", "Block-printed cotton fabrics"],
        "gi": [],
        "clusters": ["Sector 17 — craft shops", "Rock Garden — recycled art inspiration"],
        "history": "Chandigarh as a Union Territory draws its craft traditions from both Punjab (Phulkari, Jutti) and Haryana (Durries, Pottery). Nek Chand's Rock Garden is itself a monumental recycled craft artwork.",
        "visit": "Sector 17 market for crafts. Rock Garden for recycled art.",
    },
}

CRAFTTRAIL_GENERAL = """
CraftTrail is India's craft discovery platform.
It maps 744+ Government of India recognised handicraft clusters and connects travellers with verified artisans.
India has 3000+ distinct craft forms, 64.66 lakh (6.5 million) artisans — 64% of them women.
There are 500+ GI (Geographical Indication) tagged products protecting traditional regional crafts.

CraftTrail's 3-tier trust system:
- Tier 1: OCR reads the Pehchan/GI card and verifies the craft against the GI registry — score up to 40
- Tier 2: An SHG/cooperative vouches in person — score up to 60  
- Tier 3: Verified by real visitor reviews — up to 100
A score of 60+ means the artisan has been physically verified.

Workshop booking process:
- Create a free account on CraftTrail
- Find an artisan on the Discover map
- Click Request a visit
- The artisan confirms via WhatsApp — the channel artisans already use
- 95% of every booking amount goes directly to the artisan
- 5% sustains the SHG that vouched for them
- Artisans never need to install any app

After completing a workshop visit, CraftTrail issues a digital certificate with a unique QR code.
It is a permanent proof that you visited a verified artisan — shareable as a link forever.

Pehchan card: Government of India identity card issued to verified artisans.
GI (Geographical Indication) tag: Legal protection for traditional products from a specific region. Only artisans from the registered regions can sell under these names.
"""


def ingest_state_knowledge():
    print("\n[1/4] Ingesting built-in state knowledge...")
    count = 0
    # General CraftTrail info
    chunks = splitter.split_text(CRAFTTRAIL_GENERAL)
    count += add_chunks(chunks, "crafttrail_general", {"source": "built_in", "type": "general"})

    for state, info in STATE_KNOWLEDGE.items():
        text = f"""
State: {state}
Crafts: {', '.join(info['crafts'])}
Culture: {info['culture']}
Products: {', '.join(info['products'])}
GI Tagged crafts: {', '.join(info['gi'])}
Craft Clusters: {', '.join(info['clusters'])}
History: {info['history']}
Visit Information: {info['visit']}
""".strip()
        chunks = splitter.split_text(text)
        slug = state.lower().replace(" ", "_").replace("&", "and")
        count += add_chunks(chunks, f"state_{slug}", {"source": "built_in", "type": "state", "state": state})

    print(f"   ✅ {count} chunks from state knowledge")
    return count


def ingest_mongodb():
    """Pull artisan profiles from MongoDB and embed them."""
    print("\n[2/4] Ingesting MongoDB artisan profiles...")
    try:
        from pymongo import MongoClient
        mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        mongo.server_info()   # will throw if not reachable
        db = mongo["crafttrail"]

        artisans = list(db.artisans.find({}, {
            "name": 1, "craft": 1, "state": 1, "district": 1,
            "bio": 1, "trustScore": 1, "availability": 1, "languages": 1,
            "workshop": 1, "cluster": 1, "_id": 0
        }))
        clusters = list(db.clusters.find({}, {
            "name": 1, "craft": 1, "state": 1, "district": 1,
            "heritageNote": 1, "_id": 0
        }))

        count = 0
        for i, a in enumerate(artisans):
            text = f"""
Artisan Name: {a.get('name', 'Unknown')}
Craft: {a.get('craft', '')}
State: {a.get('state', '')}
District: {a.get('district', '')}
Bio: {a.get('bio', '')}
Trust Score: {a.get('trustScore', 0)}/100
Availability: {a.get('availability', {}).get('state', 'unknown') if isinstance(a.get('availability'), dict) else ''}
Languages: {', '.join(a.get('languages', []))}
Workshop: {a.get('workshop', {}).get('title', '') if isinstance(a.get('workshop'), dict) else ''}
Workshop Duration: {a.get('workshop', {}).get('durationMins', '') if isinstance(a.get('workshop'), dict) else ''} minutes
Workshop Price: Rs {a.get('workshop', {}).get('priceInr', '') if isinstance(a.get('workshop'), dict) else ''} per person
""".strip()
            chunks = splitter.split_text(text)
            count += add_chunks(chunks, f"artisan_{i}", {"source": "mongodb", "type": "artisan", "state": a.get("state", "")})

        for i, c in enumerate(clusters):
            text = f"""
Cluster Name: {c.get('name', '')}
Craft: {c.get('craft', '')}
State: {c.get('state', '')}
District: {c.get('district', '')}
Heritage: {c.get('heritageNote', '')}
""".strip()
            chunks = splitter.split_text(text)
            count += add_chunks(chunks, f"cluster_{i}", {"source": "mongodb", "type": "cluster"})

        print(f"   ✅ {count} chunks from MongoDB ({len(artisans)} artisans, {len(clusters)} clusters)")
        return count

    except Exception as e:
        print(f"   ⚠️  MongoDB not reachable ({e}) — skipping. Start the server to include artisan data.")
        return 0


def parse_tabular_rows(text: str) -> list[str] | None:
    """Try to parse TSV/CSV-style rows into structured text records."""
    if "\t" not in text and "," not in text:
        return None
    try:
        delimiter = "\t" if "\t" in text else ","
        reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        if not reader.fieldnames:
            return None
        rows = []
        for row in reader:
            if not row:
                continue
            cleaned = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.items() if k}
            if not any(str(v).strip() for v in cleaned.values() if v is not None):
                continue
            row_text = " | ".join([f"{k}: {v}" for k, v in cleaned.items() if v is not None and str(v).strip()])
            rows.append(row_text)
        return rows if rows else None
    except Exception:
        return None


def ingest_files():
    """Load PDF, CSV, TXT files from ./data/ directory."""
    print("\n[3/4] Ingesting files from ./data/ ...")
    DATA_DIR.mkdir(exist_ok=True)
    count = 0

    # ── PDF files ──────────────────────────────────────────────────
    pdf_files = list(DATA_DIR.glob("*.pdf"))
    if pdf_files:
        from langchain_community.document_loaders import PyPDFLoader
        for pdf in pdf_files:
            try:
                loader = PyPDFLoader(str(pdf))
                pages  = loader.load()
                for j, page in enumerate(pages):
                    chunks = splitter.split_text(page.page_content)
                    count += add_chunks(chunks, f"pdf_{pdf.stem}_p{j}", {"source": str(pdf.name), "type": "pdf"})
                print(f"   📄 {pdf.name} — {len(pages)} pages")
            except Exception as e:
                print(f"   ❌ {pdf.name} failed: {e}")

    # ── TXT / Markdown / tab-separated files ───────────────────────
    txt_files = list(DATA_DIR.glob("*.txt")) + list(DATA_DIR.glob("*.md")) + list(DATA_DIR.glob("*.tsv")) + list(DATA_DIR.glob("*.tab"))
    for txt in txt_files:
        try:
            text = txt.read_text(encoding="utf-8", errors="ignore")
            rows = parse_tabular_rows(text)
            if rows:
                for idx, row_text in enumerate(rows):
                    chunks = splitter.split_text(row_text)
                    count += add_chunks(chunks, f"txt_{txt.stem}_row{idx}", {"source": str(txt.name), "type": "text", "format": "table"})
                print(f"   📝 {txt.name} — {len(rows)} structured rows")
            else:
                chunks = splitter.split_text(text)
                count += add_chunks(chunks, f"txt_{txt.stem}", {"source": str(txt.name), "type": "text"})
                print(f"   📝 {txt.name} — {len(chunks)} chunks")
        except Exception as e:
            print(f"   ❌ {txt.name} failed: {e}")

    # ── CSV / Excel files ──────────────────────────────────────────
    csv_files = list(DATA_DIR.glob("*.csv")) + list(DATA_DIR.glob("*.xlsx"))
    if csv_files:
        import pandas as pd
        for csv in csv_files:
            try:
                df = pd.read_csv(csv) if csv.suffix == ".csv" else pd.read_excel(csv)
                # Convert each row to a readable text block
                texts = []
                for _, row in df.iterrows():
                    row_text = " | ".join([f"{col}: {val}" for col, val in row.items() if str(val) != "nan"])
                    texts.append(row_text)
                all_text = "\n".join(texts)
                chunks   = splitter.split_text(all_text)
                count   += add_chunks(chunks, f"csv_{csv.stem}", {"source": str(csv.name), "type": "csv"})
                print(f"   📊 {csv.name} — {len(df)} rows")
            except Exception as e:
                print(f"   ❌ {csv.name} failed: {e}")

    if not (pdf_files or txt_files or csv_files):
        print("   ℹ️  No files found in ./data/ — drop PDF, TXT, or CSV files there and re-run.")

    print(f"   ✅ {count} chunks from files")
    return count


def ingest_json_export():
    """Load pre-exported JSON knowledge files."""
    print("\n[4/4] Checking for JSON exports...")
    json_files = list(DATA_DIR.glob("*.json"))
    count = 0
    for jf in json_files:
        try:
            data = json.loads(jf.read_text())
            if isinstance(data, list):
                for i, item in enumerate(data):
                    text   = json.dumps(item, ensure_ascii=False)
                    chunks = splitter.split_text(text)
                    count += add_chunks(chunks, f"json_{jf.stem}_{i}", {"source": str(jf.name), "type": "json"})
            elif isinstance(data, dict):
                text   = json.dumps(data, ensure_ascii=False)
                chunks = splitter.split_text(text)
                count += add_chunks(chunks, f"json_{jf.stem}", {"source": str(jf.name), "type": "json"})
            print(f"   📦 {jf.name} — {count} chunks")
        except Exception as e:
            print(f"   ❌ {jf.name} failed: {e}")
    return count


if __name__ == "__main__":
    print("=" * 60)
    print("  CraftTrail RAG — Knowledge Ingestion")
    print("=" * 60)

    total = 0
    total += ingest_state_knowledge()
    total += ingest_mongodb()
    total += ingest_files()
    total += ingest_json_export()

    final_count = collection.count()
    print(f"\n{'=' * 60}")
    print(f"  ✅ Ingestion complete!")
    print(f"  📚 Total vectors in ChromaDB: {final_count}")
    print(f"  📁 DB saved at: {os.path.abspath(CHROMA_PATH)}")
    print(f"{'=' * 60}")
    print("\nNow start the Flask server:  python app.py")
