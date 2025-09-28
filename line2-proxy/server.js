import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 3000;

// Quays where buses leave Fyllingsdalen terminal
const quayIds = [
  "NSR:Quay:106949", // update with actual quay IDs
  "NSR:Quay:106950"
];

// Lines we want to show
const linesToShow = ["2", "4", "50E"];

app.get("/departures", async (req, res) => {
  try {
    // Build GraphQL query for all quays
    const queries = quayIds.map(
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

    const query = `{ ${queries} }`;

    const response = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ET-Client-Name": "gethomepage-dashboard",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    // Collect all calls from all quays
    const allCalls = Object.values(data.data).flatMap(q => q.estimatedCalls);

    // Filter by line and format times
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