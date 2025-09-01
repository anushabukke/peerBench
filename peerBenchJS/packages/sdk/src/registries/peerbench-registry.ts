import { Prompt, PromptResponse, PromptScore } from "@/types";
import { AbstractRegistry } from "./abstract/abstract-registry";
import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { sleep } from "@/utils/sleep";
import { Account } from "viem";
import axios from "axios";

/**
 * Registry implementation for peerBench server
 */
export class PeerBenchRegistry extends AbstractRegistry {
  // Static accessor for the identifier
  static readonly identifier = "peerbench";
  readonly identifier = PeerBenchRegistry.identifier;

  private token?: string;
  private supabaseClient: SupabaseClient;
  private apiURL: string;
  private session: Session | null = null;
  private readonly email: string;
  private readonly password: string;
  private refreshTokenInterval?: NodeJS.Timeout;
  private isRefreshingToken = false;
  private isClosed = false;
  private isInitialized = false;
  private tokenRefresher: boolean;

  constructor(options: {
    peerbenchSupabaseURL: string;
    peerbenchSupabaseAnonKey: string;
    peerbenchApiURL: string;
    email: string;
    password: string;

    /**
     * Supabase tokens must be refreshed periodically.
     * But if the class usage is short-lived, it's not necessary to start
     * a background interval for refreshing the token.
     * @default false
     */
    tokenRefresher?: boolean;
  }) {
    super();

    this.supabaseClient = createClient(
      options.peerbenchSupabaseURL,
      options.peerbenchSupabaseAnonKey
    );
    this.apiURL = options.peerbenchApiURL;

    this.email = options.email;
    this.password = options.password;

    this.tokenRefresher = options.tokenRefresher ?? false;
  }

  async uploadPrompts(
    prompts: Prompt[],
    options?: {
      promptSetId: number;
      /**
       * For signing the generated Prompt file.
       * The file won't be signed if not provided.
       */
      account?: Account;
    }
  ): Promise<number> {
    await this.init();

    const fileName = `prompts-${this.identifier}-${Date.now()}.json`;
    const fileContent = JSON.stringify(prompts); // PeerBench standard format is a JSON Prompts array

    let signature: string | undefined;
    if (options?.account && options.account.signMessage) {
      signature = await options.account.signMessage({
        message: fileContent,
      });
    }

    const res = await axios.post(
      `${this.apiURL}/v1/prompts`,
      {
        promptSetId: options?.promptSetId,
        fileName,
        fileContent,
        signature,
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    return res.data?.count ?? prompts.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async uploadResponses(responses: PromptResponse[]): Promise<number> {
    throw new Error("Method not implemented.");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async uploadScores(scores: PromptScore[]): Promise<number> {
    throw new Error("Method not implemented.");
  }

  private async init() {
    if (this.isClosed || this.isInitialized) {
      return;
    }

    const authData = await this.login(this.email, this.password);

    this.session = authData?.session || null;
    this.token = this.session?.access_token;

    if (!this.token) {
      throw new Error(
        `Failed authentication with peerBench: No token received`
      );
    }

    if (this.tokenRefresher) {
      // Refresh the token 15 minutes before it expires
      this.refreshTokenInterval = setInterval(
        () => this.refreshToken(),
        (this.session!.expires_in - 15 * 60) * 1000
      );
    }

    this.isInitialized = true;
  }

  /**
   * Clears the interval execution for refreshing the token.
   */
  async clearRefreshInterval() {
    this.isClosed = true;
    clearInterval(this.refreshTokenInterval!);
  }

  /**
   * Refreshes the token if it is about to expire.
   */
  private async refreshToken() {
    if (this.isClosed) {
      return;
    }

    if (this.isRefreshingToken) {
      // Interval is already set
      return;
    }

    this.isRefreshingToken = true;
    while (!this.isClosed) {
      try {
        const { data, error } = await this.supabaseClient.auth.refreshSession(
          this.session || undefined
        );
        if (error) {
          throw new Error(error.message);
        }

        this.session = data.session;
        this.token = this.session?.access_token;
        break;
      } catch (err) {
        console.error(`PeerBenchRegistry: Failed to refresh token`, err);
        console.error(`PeerBenchRegistry: Retrying in 10 seconds`);
        await sleep(10_000);
      }
    }
    this.isRefreshingToken = false;
  }

  private async login(email: string, password: string) {
    const { data, error } = await this.supabaseClient!.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Failed login to peerBench: ${error.message}`);
    }

    if (!data.session) {
      throw new Error(`No session returned from peerBench authentication`);
    }

    return data;
  }
}
