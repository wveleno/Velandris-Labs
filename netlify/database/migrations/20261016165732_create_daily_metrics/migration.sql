CREATE TABLE "daily_metrics" (
	"day" date,
	"metric" text,
	"dimension" text,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_metrics_pkey" PRIMARY KEY("day","metric","dimension")
);
