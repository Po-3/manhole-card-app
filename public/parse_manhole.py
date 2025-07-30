import json
from bs4 import BeautifulSoup

# 画像の絶対パス先頭
BASE_IMG_URL = "https://ekikaramanhole.whitebeach.org/ext/manholecard/"

with open("マンホールカード一覧.html", "r", encoding="utf-8") as f:
    html = f.read()
soup = BeautifulSoup(html, "html.parser")

cards = []

for div in soup.find_all("div", class_="open_detail"):
    id_ = div.get("data-name") or ""
    series_img = div.find("img", class_="series_s")
    series = series_img["alt"] if series_img else ""
    img_tag = div.find("img", class_="card-image_s")
    imageUrl = BASE_IMG_URL + img_tag["src"] if img_tag else ""
    strong = div.find("strong")
    city = strong.text.strip() if strong else ""
    pref = ""
    pref_tag = div.find("a", attrs={"data-filter": lambda x: x and x.startswith("pref_")})
    if pref_tag:
        pref = pref_tag.text.strip()
    jis = div.find("span", class_="jis_code")
    jis_code = jis.text.strip() if jis else ""
    prod = div.find("span", class_="product_number")
    product_number = prod.text.strip() if prod else ""
    detail_id = f"detail_{id_}"
    detail_div = soup.find("div", id=detail_id)
    latitude, longitude, details, genres, distribution_place = None, None, "", [], ""
    if detail_div:
        details_span = detail_div.find("span", class_="card-id")
        details = details_span.text.strip() if details_span else ""
        a_map = detail_div.find("a", href=lambda x: x and "lat=" in x and "lng=" in x)
        if a_map:
            import re
            lat_match = re.search(r"lat=([0-9.]+)", a_map["href"])
            lng_match = re.search(r"lng=([0-9.]+)", a_map["href"])
            if lat_match and lng_match:
                latitude = float(lat_match.group(1))
                longitude = float(lng_match.group(1))
            distribution_place = a_map.text.strip()
        pict_div = detail_div.find("div", class_="pict")
        genres = []
        if pict_div:
            for pict in pict_div.find_all("img", class_="pict"):
                if pict.has_attr("title"):
                    genres.append(pict["title"])
    cards.append({
        "id": id_,
        "series": series,
        "imageUrl": imageUrl,
        "prefecture": pref,
        "city": city,
        "jisCode": jis_code,
        "productNumber": product_number,
        "latitude": latitude,
        "longitude": longitude,
        "details": details,
        "genres": genres,
        "distributionPlace": distribution_place
    })

# manhole_cards.jsonとして上書き保存
with open("manhole_cards.json", "w", encoding="utf-8") as f:
    json.dump(cards, f, ensure_ascii=False, indent=2)