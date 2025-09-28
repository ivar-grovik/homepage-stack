import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

// Stop/Quay IDs
const stopPlaceId = "NSR:StopPlace:62104";     // Line 2
const quayIds = ["NSR:Quay:106949", "NSR:Quay:106950"]; // Line 4 + 50E

// Lines we want to display
const linesToShow = ["2", "4", "50E"];

app.get("/departures", async (req, res) => {
  try {
    // Build GraphQL query
    const quayQueries = quayIds.map(
      id => `
        q${id.replace(/\D/g, "")}: quay(id: "${id}") {
          id
          estimatedCalls(timeRange: 86400, numberOfDepartures: 20) {
            expectedDepartureTime
            destinationDisplay { frontText }
            serviceJourney { line { publicCode } }
          }
        }
      `
    ).join("\n");

    const query = `{
      stop: stopPlace(id: "${stopPlaceId}") {
        estimatedCalls(timeRange: 86400, numberOfDepartures: 20) {
          expectedDepartureTime
          destinationDisplay { frontText }
          serviceJourney { line { publicCode } }
        }
      }
      ${quayQueries}
    }`;

    const response = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ET-Client-Name": "gethomepage-dashboard",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    // Merge calls from stopPlace + all quays
    const allCalls = [
      ...(data.data.stop?.estimatedCalls || []),
      ...Object.values(data.data).filter(x => x?.estimatedCalls).flatMap(q => q.estimatedCalls),
    ];

    // Group by line
    const result = linesToShow.map(code => {
      const filtered = allCalls
        .filter(c => c.serviceJourney.line.publicCode === code)
        .slice(0, 2)
        .map(c => {
          const date = new Date(c.expectedDepartureTime);
          date.setHours(date.getHours() + 2); // adjust timezone
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return {
            destination: c.destinationDisplay.frontText,
            time: `${hours}:${minutes}`
          };
        });

      return { line: code, departures: filtered };
    });

    res.json({ stop: "Fyllingsdalen terminal", lines: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch departures" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on http://localhost:${PORT}/departures`);
});