# Видео для баннера на странице входа

- `tire-banner.webm` — VP9, основной вариант (Chrome, Firefox, Edge)
- `tire-banner.mp4` — H.264, запасной (Safari, iPhone)
- `tire-banner-poster.jpg` — первый кадр, показывается, пока видео грузится

Всё в 1280×720, 30 кадр/с, 15,5 с, без звука. Исходник — «wet new tire rotating in the dark» (1920×1080 .mov, 73 МБ).
На странице видео отзеркалено через CSS (`transform: scaleX(-1)`), чтобы шина смотрела на форму.

## Как пережать новое видео (ffmpeg)

```
ffmpeg -i исходник.mov -an -vf "scale=1280:720:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 26 -profile:v high -movflags +faststart tire-banner.mp4
ffmpeg -i исходник.mov -an -vf "scale=1280:720:flags=lanczos,format=yuv420p" -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 tire-banner.webm
ffmpeg -i исходник.mov -frames:v 1 -vf "scale=1280:720" -q:v 6 tire-banner-poster.jpg
```

После замены поднять `?v=N` у видео в `index.html`, иначе браузер покажет старое из кэша.
