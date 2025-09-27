import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

// Define lines and directions you want
const linesToShow = [
  { code: "2" },
  { code: "4", direction: "City Center" },
  { code: "50E", direction: "Bergen Bus Station" },
];

app.get("/departures", async (req, res) => {
  const query = {
    query: `{
      stopPlace(id: "NSR:StopPlace:62104") {
        estimatedCalls(timeRange: 7200, numberOfDepartures: 20) {
          expectedDepartureTime
          destinationDisplay { frontText }
          serviceJourney { line { publicCode } }
        }
      }
    }`,
  };

  const r = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ET-Client-Name": "gethomepage-dashboard",
    },
    body: JSON.stringify(query),
  });

  const data = await r.json();

  const departures = linesToShow.map(({ code, direction }) => {
    // Filter by line and optional direction
    const filtered = data.data.stopPlace.estimatedCalls
      .filter(c => c.serviceJourney.line.publicCode === code)
      .filter(c => !direction || c.destinationDisplay.frontText === direction)
      .slice(0, 2)
      .map(c => {
        const date = new Date(c.expectedDepartureTime);
        date.setHours(date.getHours() + 2); // adjust timezone
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return { line: code, time: `${hours}:${minutes}` };
      });

    return { line: code, departures: filtered };
  });

  res.json({ stop: "Fyllingsdalen terminal", lines: departures });
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}/departures`);
});
