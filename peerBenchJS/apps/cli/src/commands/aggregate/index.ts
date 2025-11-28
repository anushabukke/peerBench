import { program } from "@/core/program";
import { logger } from "@/core/logger";
import { FileSchema } from "@/validation/file-schema";
import { JSONSchema } from "@/validation/json-schema";
import { z } from "zod";
import { PromptScoreSchema } from "peerbench";
import { table as formatTable } from "table";
import { basename } from "path";

interface AggregatedResult {
  model: string;
  modelOwner: string;
  modelName: string;
  provider: string;
  totalResponses: number;
  correctAnswers: number;
  wrongAnswers: number;
  avgScore: number;
  avgLatency: number;
}

program
  .command("aggregate")
  .alias("agg")
  .description("Aggregates the given score files and displays summary statistics")
  .requiredOption(
    "-s, --score <paths...>",
    "Path to the Score files",
    (value, previous?: string[]) => {
      // Validate that the file exists
      const path = FileSchema({
        message: "Score file doesn't exist",
        returnType: "path",
      }).parse(value);

      return [...(previous || []), path];
    }
  )
  .option(
    "-f, --format <type>",
    'Output format: "table" or "json" (default: "table")',
    "table"
  )
  .action(
    async (options: { score: string[]; format: string }) => {
      const scorePaths = options.score;
      const format = options.format;

      logger.info(`Aggregating ${scorePaths.length} score files`);

      // Load all score files
      const allScores: any[] = [];
      for (const scorePath of scorePaths) {
        const content = FileSchema({ returnType: "content" }).parse(scorePath);
        const json = JSON.parse(content);

        if (!Array.isArray(json)) {
          throw new Error(`Score file ${scorePath} is not a valid array`);
        }

        allScores.push(...json);
        logger.debug(`Loaded ${json.length} scores from ${basename(scorePath)}`);
      }

      // Group scores by model
      const scoresByModel = new Map<string, any[]>();
      for (const score of allScores) {
        const modelKey = `${score.score.provider}:${score.score.modelOwner}/${score.score.modelName}`;
        if (!scoresByModel.has(modelKey)) {
          scoresByModel.set(modelKey, []);
        }
        scoresByModel.get(modelKey)!.push(score);
      }

      // Calculate aggregated statistics
      const results: AggregatedResult[] = [];
      for (const [modelKey, scores] of scoresByModel) {
        const totalResponses = scores.length;
        const totalScore = scores.reduce((sum, s) => sum + s.score.score, 0);
        const correctAnswers = scores.filter((s) => s.score.score === 1).length;
        const wrongAnswers = scores.filter((s) => s.score.score === 0).length;
        const avgScore = totalScore / totalResponses;

        // Calculate average latency
        const avgLatency =
          scores.reduce((sum, s) => sum + (s.finishedAt - s.startedAt), 0) /
          totalResponses;

        results.push({
          model: modelKey,
          modelOwner: scores[0].score.modelOwner,
          modelName: scores[0].score.modelName,
          provider: scores[0].score.provider,
          totalResponses,
          correctAnswers,
          wrongAnswers,
          avgScore,
          avgLatency,
        });
      }

      // Sort by average score (descending)
      results.sort((a, b) => b.avgScore - a.avgScore);

      // Output results
      if (format === "json") {
        console.log(JSON.stringify(results, null, 2));
      } else {
        // Table format
        const tableData = [
          [
            "Rank",
            "Model",
            "Provider",
            "Total",
            "Correct",
            "Wrong",
            "Accuracy (%)",
            "Avg Latency (ms)",
          ],
          ...results.map((r, i) => [
            (i + 1).toString(),
            `${r.modelOwner}/${r.modelName}`,
            r.provider,
            r.totalResponses.toString(),
            r.correctAnswers.toString(),
            r.wrongAnswers.toString(),
            (r.avgScore * 100).toFixed(2),
            r.avgLatency.toFixed(0),
          ]),
        ];

        console.log("\n" + formatTable(tableData, {
          border: {
            topBody: `─`,
            topJoin: `┬`,
            topLeft: `┌`,
            topRight: `┐`,
            bottomBody: `─`,
            bottomJoin: `┴`,
            bottomLeft: `└`,
            bottomRight: `┘`,
            bodyLeft: `│`,
            bodyRight: `│`,
            bodyJoin: `│`,
            joinBody: `─`,
            joinLeft: `├`,
            joinRight: `┤`,
            joinJoin: `┼`,
          },
        }));
      }

      logger.info("Aggregation complete");
    }
  );
