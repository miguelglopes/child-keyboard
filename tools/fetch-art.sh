#!/usr/bin/env bash
# Download the official art for the kids'-show themes:
#   assets/chars/<theme>/<id>.webp     character icons (160px, a few KB each)
#   assets/backgrounds/<theme>.webp    a still from the show (1280×720, darkened)
#
# The art is copyrighted, so both dirs are gitignored and never committed to
# the public repo. Run this once per machine; webos/build.sh bundles the
# result into the .ipk and tools/push-art.sh copies it to the web server.
# Missing characters fall back to emoji; a missing background leaves the
# theme's colour gradient.
#
# Sources are files on Fandom wikis, resolved through the MediaWiki API.
#
# Usage: tools/fetch-art.sh [--force]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHARS="$ROOT_DIR/assets/chars"
BACKGROUNDS="$ROOT_DIR/assets/backgrounds"
SIZE=160
BG_W=1280
BG_H=720
FORCE=${1:-}

command -v magick >/dev/null || { echo "error: ImageMagick (magick) is required" >&2; exit 1; }

# theme/id  wiki-api-base  file-name
SOURCES='
paw/ryder         pawpatrol.fandom.com            Pic-ryder_x1500.webp
paw/chase         pawpatrol.fandom.com            Chase_PNG.png
paw/marshall      pawpatrol.fandom.com            Marshall_PNG.png
paw/skye          pawpatrol.fandom.com            PAW_Patrol_Skye_PNG_2.png
paw/rubble        pawpatrol.fandom.com            Rubble_PNG.png
paw/rocky         pawpatrol.fandom.com            Rocky_PNG.png
paw/zuma          pawpatrol.fandom.com            Zuma_PNG.png
paw/everest       pawpatrol.fandom.com            Everest_-_Standard_Official_Vector_02.png
paw/tracker       pawpatrol.fandom.com            Tracker0.png
paw/liberty       pawpatrol.fandom.com            Liberty_Movie_Book_updated.png
paw/chickaletta   pawpatrol.fandom.com            Chickaletta_Official_Vector_Art.png
masha/masha       masha-and-the-bear.fandom.com   Masha.png
masha/urso        mashaandthebear.fandom.com/ru   Медведь.png
masha/panda       mashaandthebear.fandom.com/ru   Панда.png
masha/pinguim     mashaandthebear.fandom.com/ru   Пингвинёнок.png
masha/lobo        mashaandthebear.fandom.com/ru   Волки.png
masha/coelho      mashaandthebear.fandom.com/ru   Заяц.png
masha/cabra       mashaandthebear.fandom.com/ru   Коза.png
masha/tigre       mashaandthebear.fandom.com/ru   Тигр.png
masha/esquilo     mashaandthebear.fandom.com/ru   Белка.png
masha/porquinha   mashaandthebear.fandom.com/ru   Розочка.png
unicorn/sophia    unicornacademy.fandom.com       Sophia.png
unicorn/wildstar  unicornacademy.fandom.com       Wildstar.png
unicorn/ava       unicornacademy.fandom.com       Ava.png
unicorn/leaf      unicornacademy.fandom.com       Leaf.png
unicorn/layla     unicornacademy.fandom.com       Layla.png
unicorn/glacier   unicornacademy.fandom.com       Glacier.png
unicorn/isabel    unicornacademy.fandom.com       Isabel.png
unicorn/river     unicornacademy.fandom.com       River.png
unicorn/valentina unicornacademy.fandom.com       Valentina.png
unicorn/cinder    unicornacademy.fandom.com       Cinder.png
unicorn/rory      unicornacademy.fandom.com       Rory.png
unicorn/storm     unicornacademy.fandom.com       Storm.png
mickey/mickey     disney.fandom.com               Disney_Mickey_Mouse.png
mickey/minnie     disney.fandom.com               Minnie_Mouse.png
mickey/donald     disney.fandom.com               Donald_Duck_Disney_1.png
mickey/margarida  disney.fandom.com               Classic_Daisy_Duck.png
mickey/pateta     disney.fandom.com               Goofy.png
mickey/pluto      disney.fandom.com               Pluto_the_pup.png
mickey/patinhas   disney.fandom.com               Scrooge_McDuck.png
mickey/clarabela  disney.fandom.com               Clarabelle_Cow_Pose.png
mickey/horacio    disney.fandom.com               Horace_Horsecollar_ADHAM.png
mickey/tico       disney.fandom.com               Chip_(no_background).png
mickey/teco       disney.fandom.com               Dale(no_background).png
'

resolve_url() {
  local api=$1 file=$2
  curl -sfG "https://$api/api.php" \
    --data-urlencode "action=query" --data-urlencode "format=json" \
    --data-urlencode "prop=imageinfo" --data-urlencode "iiprop=url" \
    --data-urlencode "titles=File:$file" |
    python3 -c 'import json,sys; p=list(json.load(sys.stdin)["query"]["pages"].values())[0]; print(p["imageinfo"][0]["url"])'
}

# Panda e os Caricas have no wiki renders, so round portraits are cropped out
# of the group promo photo (900×900): theme/id  centre-x  centre-y  size.
GROUP_PHOTO='youtube.fandom.com Panda_E_Os_Caricas.jpg'
CROPS='
panda/pedro    180 345 160
panda/pipa     258 400 160
panda/panda    452 300 330
panda/clarinha 660 370 200
panda/matias   800 330 240
'

# Backgrounds: theme  wiki-api-base  file-name  [crop applied before fitting]
BACKGROUND_SOURCES='
paw      pawpatrol.fandom.com            Lookout_Season_2.png
masha    mashaandthebear.fandom.com/ru   01_Дом_Медведя.jpg
unicorn  unicornacademy.fandom.com       UnicornAcademyScreenshot1.jpeg
mickey   disney.fandom.com               Clubhouse_flying_away.png
panda    youtube.fandom.com              Panda_E_Os_Caricas.jpg   900x506+0+150
'

# download <api> <file> <dst> [scale-width]
# The image CDN rejects bare curl; plain browser headers are enough. A scale
# width asks for a pre-scaled copy so we don't pull 1500px originals.
download() {
  local api=$1 file=$2 dst=$3 scale=${4:-} url
  url=$(resolve_url "$api" "$file") || return 1
  [ -n "$scale" ] && url=${url/\/revision\/latest//revision/latest/scale-to-width-down/$scale}
  curl -sfL -o "$dst" \
    -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36" \
    -H "Accept: image/avif,image/webp,image/*" -H "Referer: https://${api%%/*}/" \
    "$url"
}

needs() { [ ! -s "$1" ] || [ "$FORCE" = "--force" ]; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
fail=0

while read -r key api file; do
  [ -z "$key" ] && continue
  dst="$CHARS/$key.webp"
  needs "$dst" || continue
  mkdir -p "$(dirname "$dst")"
  if ! download "$api" "$file" "$tmp/src" 400; then
    echo "✗ $key: could not fetch $file from $api" >&2; fail=1; continue
  fi
  # Trim transparent margins, fit in SIZE×SIZE, keep alpha.
  magick "$tmp/src[0]" -trim +repage -resize "${SIZE}x${SIZE}" \
    -quality 82 -define webp:alpha-quality=90 "$dst"
  echo "✓ $key ($(wc -c <"$dst") bytes)"
  # A square backdrop looks wrong over the themed background — pick another file.
  [ "$(magick identify -format '%[opaque]' "$dst")" = "True" ] && echo "  ⚠ $key has no transparency" >&2
  sleep 0.3   # be gentle with the wiki API
done <<<"$SOURCES"

group=''
while read -r key cx cy size; do
  [ -z "$key" ] && continue
  dst="$CHARS/$key.webp"
  needs "$dst" || continue
  if [ -z "$group" ]; then
    # shellcheck disable=SC2086
    if ! download $GROUP_PHOTO "$tmp/group"; then
      echo "✗ could not fetch the Panda e os Caricas group photo" >&2; fail=1; break
    fi
    group="$tmp/group"
  fi
  mkdir -p "$(dirname "$dst")"
  r=$((SIZE / 2))
  magick "$group[0]" -crop "${size}x${size}+$((cx - size / 2))+$((cy - size / 2))" +repage \
    -resize "${SIZE}x${SIZE}" \
    \( -size "${SIZE}x${SIZE}" xc:black -fill white -draw "circle $r,$r $r,2" \) \
    -alpha off -compose CopyOpacity -composite \
    -quality 82 -define webp:alpha-quality=90 "$dst"
  echo "✓ $key ($(wc -c <"$dst") bytes)"
done <<<"$CROPS"

mkdir -p "$BACKGROUNDS"
while read -r theme api file crop; do
  [ -z "$theme" ] && continue
  dst="$BACKGROUNDS/$theme.webp"
  needs "$dst" || continue
  if ! download "$api" "$file" "$tmp/bg" "$BG_W"; then
    echo "✗ background $theme: could not fetch $file from $api" >&2; fail=1; continue
  fi
  # Cover-crop to 16:9, then make it a neutral backdrop here, once: blurred,
  # mostly desaturated and squeezed into a dark, low-contrast range, so the
  # colourful letters, icons and numbers on top never blend into it — and no
  # CSS filter has to run on the TV.
  magick "$tmp/bg[0]" ${crop:+-crop "$crop" +repage} \
    -resize "${BG_W}x${BG_H}^" -gravity center -extent "${BG_W}x${BG_H}" \
    -blur 0x5 -modulate 100,40 +level 8%,42% -quality 60 "$dst"
  echo "✓ background $theme ($(wc -c <"$dst") bytes)"
  sleep 0.3
done <<<"$BACKGROUND_SOURCES"

exit $fail
