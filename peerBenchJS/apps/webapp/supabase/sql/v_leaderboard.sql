CREATE
OR REPLACE VIEW v_leaderboard AS
SELECT
  (
    CASE
      WHEN tr.model_name IS NOT NULL THEN tr.model_name
      ELSE tr.provider
    END
  ) AS model,
  (
    CASE
      WHEN e.prompt_set_id IS NOT NULL THEN ps.title
      ELSE e.protocol_name
    END
  ) AS context,
  (
    CASE
      WHEN e.prompt_set_id IS NULL THEN AVG(e.score)
      ELSE NULL
    END
  ) AS avg_score,
  (
    CASE
      WHEN e.prompt_set_id IS NULL THEN NULL
      ELSE SUM(tr.score) / COUNT(tr.id)
    END
  ) AS accuracy,
  COUNT(DISTINCT e.id) AS total_evaluations,
  MAX(e.finished_at) AS recent_evaluation,
  (
    CASE
      WHEN e.prompt_set_id IS NOT NULL THEN COUNT(DISTINCT p.id)
      ELSE NULL
    END
  ) AS unique_prompts,
  COUNT(tr.id) AS total_tests_performed,
  e.prompt_set_id,
  p.type as prompt_type
FROM
  test_results tr
  INNER JOIN evaluations e ON tr.evaluation_id = e.id
  LEFT JOIN prompt_sets ps ON ps.id = e.prompt_set_id
  LEFT JOIN prompts p ON tr.prompt_id = p.id
GROUP BY
  model,
  context,
  p.type,
  e.prompt_set_id
HAVING
  (
    CASE
      WHEN e.prompt_set_id IS NULL THEN AVG(e.score)
      ELSE NULL
    END
  ) > 0
  OR (
    CASE
      WHEN e.prompt_set_id IS NULL THEN NULL
      ELSE SUM(tr.score) / COUNT(tr.id)
    END
  ) > 0;

GRANT
SELECT
  ON public.v_leaderboard TO public;

GRANT
SELECT
  ON public.v_leaderboard TO anon;