# YouTube Chess Search

Search Daniel Naroditsky's YouTube videos for moments that show a chess position. Play moves on the board, or load a FEN or PGN in the field below it. Browse matching moments by video and timestamp; open a result to jump to that moment on YouTube.

The app searches a JSON file in the browser. It does not need a search server or database, so the built site can be hosted as static files.

## Run locally

Install Node.js 26 and npm, then run:

```sh
npm ci
npm start
```

Open `http://localhost:4200/` in your browser. The development server prints its address when it starts.

## Position data

The app loads `src/data/combined-positions.json` when it starts. Keep that filename and location when updating the data. The file must be valid JSON and use the `yt-chess-search-channel-data/v1` format. This minimal example shows the fields the search app reads:

```json
{
  "schemaVersion": "yt-chess-search-channel-data/v1",
  "channelId": "EXAMPLE_CHANNEL_ID",
  "videos": [
    {
      "videoId": "EXAMPLE_VIDEO_ID",
      "videoName": "Example chess game",
      "sourceUrl": "https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID",
      "uploadDate": "20210424",
      "durationSeconds": 2376,
      "positions": [
        {
          "piecePlacement": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",
          "timeFromSeconds": 12.5,
          "timeToSeconds": 18,
          "boardOrientation": "black_bottom"
        }
      ]
    }
  ]
}
```

Replace the example IDs and title with values for your videos. The fields mean:

| Field              | Meaning                                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`    | Must be exactly `yt-chess-search-channel-data/v1`.                                                                                                                                                                                                   |
| `channelId`        | The YouTube channel ID, as a string.                                                                                                                                                                                                                 |
| `videos`           | A list of videos. It may be empty.                                                                                                                                                                                                                   |
| `videoId`          | The YouTube video ID.                                                                                                                                                                                                                                |
| `videoName`        | The title shown in search results.                                                                                                                                                                                                                   |
| `sourceUrl`        | The YouTube video URL. Search results add the matched start time to this URL.                                                                                                                                                                        |
| `uploadDate`       | The upload date in `YYYYMMDD` format, or `null`. Results use it to sort newest first and display the date.                                                                                                                                           |
| `durationSeconds`  | The video duration in seconds, or `null`. Results display it as `m:ss` or `h:mm:ss`.                                                                                                                                                                 |
| `positions`        | A list of intervals when a position appears in the video. It may be empty.                                                                                                                                                                           |
| `piecePlacement`   | The board placement part of a FEN string: eight ranks separated by `/`, with uppercase letters for White pieces, lowercase letters for Black pieces, and digits for runs of empty squares. It does not include whose turn it is or other FEN fields. |
| `timeFromSeconds`  | The start of the interval, in seconds from the beginning of the video.                                                                                                                                                                               |
| `timeToSeconds`    | The end of the interval, in seconds from the beginning of the video.                                                                                                                                                                                 |
| `boardOrientation` | The orientation label recorded for the board, as a string, or `null` if unknown.                                                                                                                                                                     |

Each video needs `videoId`, `videoName`, `sourceUrl`, and `positions`. `uploadDate` and `durationSeconds` are optional. Each position needs all four fields shown in the example.

Search results show one row per video, sorted by upload date with the newest first. Each row lists every matching interval as a clickable timestamp below the video title.

The board's FEN or PGN field accepts a single game's main line, including PGN headers, comments, and setup FENs. PGN search checks the position after each played move, beginning with the final position. Each video appears once at its latest matching position. Results are ordered by how few half moves precede the latest position found in any video; ties use the same upload date, title, and video ID order as Position search. A `-1 half move from last position found` counter means the match is one ply earlier; `-2` means two plies earlier. The board shows the latest found position, and Back and Forward step through the game. PGN results load 20 videos at a time; Position results load 50.

After saving an updated data file, run the app locally to see the new search results:

```sh
npm start
```

To publish the update, commit the changed data file and push it to `main`. The GitHub Actions workflow runs the tests, builds the site, and deploys it to GitHub Pages. Updating a local file alone does not change the published site.

## GitHub Pages

The site is built for the `/yt-chess-search/` URL path, as set by `--base-href` in `.github/workflows/deploy.yml`. If you publish it under a different path, change that value to match. The site and its JSON data are static files; searches run locally in each visitor's browser.
