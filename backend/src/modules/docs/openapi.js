export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Reconnect AI Network Intelligence CRM API",
    version: "1.0.0",
    description: "Draft OpenAPI for contacts, imports and graph payloads."
  },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/contacts": {
      get: {
        summary: "List private contacts",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "tag", in: "query", schema: { type: "string" } },
          { name: "ddd", in: "query", schema: { type: "string" } }
        ],
        responses: {
          200: {
            description: "Contact list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Contact" } }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/contacts/import": {
      post: {
        summary: "Receive a structured contact import payload",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContactImportRequest" }
            }
          }
        },
        responses: {
          202: {
            description: "Import accepted and processed asynchronously in MVP-compatible mode",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContactImportResponse" }
              }
            }
          }
        }
      }
    },
    "/contacts/import/google": {
      post: {
        summary: "Import contacts from Google People API using an OAuth access token with contacts scope",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["accessToken"],
                properties: {
                  accessToken: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          202: {
            description: "Google contacts imported into the private CRM"
          }
        }
      }
    },
    "/graphs/internal": {
      get: {
        summary: "Return internal graph nodes and edges",
        responses: {
          200: {
            description: "Graph payload",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GraphPayload" }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Contact: {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          description: { type: "string" },
          emails: { type: "array", items: { type: "string", format: "email" } },
          phones: { type: "array", items: { type: "string" } },
          derivedDdd: { type: "string", nullable: true },
          derivedDdds: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
          sourceOrigin: { type: "string", enum: ["google_contacts", "csv", "manual", "apple_contacts", "outlook", "linkedin_export", "other"] },
          socialLinks: { type: "object" },
          currentDemand: { type: "string" },
          problemSolved: { type: "string" },
          internalNotes: { type: "string" },
          recordScopes: {
            type: "array",
            items: { type: "string", enum: ["INTERNAL_PRIVATE", "PUBLIC_PLATFORM_PROFILE", "GROUP_CONTACT"] }
          },
          linkedUserId: { type: "string", nullable: true },
          customValues: { type: "object" }
        }
      },
      ContactImportRequest: {
        type: "object",
        required: ["source", "rows"],
        properties: {
          source: { type: "string", enum: ["google_contacts", "csv", "manual", "apple_contacts", "outlook", "linkedin_export", "other"] },
          rows: { type: "array", items: { $ref: "#/components/schemas/Contact" } }
        }
      },
      ContactImportResponse: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              job: { type: "object" },
              contacts: { type: "array", items: { $ref: "#/components/schemas/Contact" } },
              duplicateCandidates: { type: "array", items: { type: "object" } }
            }
          }
        }
      },
      GraphPayload: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              generatedAt: { type: "string", format: "date-time" },
              nodes: { type: "array", items: { $ref: "#/components/schemas/GraphNode" } },
              edges: { type: "array", items: { $ref: "#/components/schemas/GraphEdge" } }
            }
          }
        }
      },
      GraphNode: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["contact", "tag"] },
          label: { type: "string" },
          weight: { type: "number" },
          score: { type: "number" }
        }
      },
      GraphEdge: {
        type: "object",
        properties: {
          id: { type: "string" },
          source: { type: "string" },
          target: { type: "string" },
          type: { type: "string" },
          weight: { type: "number" }
        }
      }
    }
  }
};
