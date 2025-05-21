import type { Core } from '@strapi/strapi';
import { Permit } from 'permitio';
import type { PermitConfig } from '../../types/permit';

const configService = ({ strapi }: { strapi: Core.Strapi }) => ({
  async getConfig(): Promise<PermitConfig | null> {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'permit-strapi',
    });

    return (await pluginStore.get({ key: 'config' })) as PermitConfig | null;
  },

  async getClient() {
    const config = await this.getConfig();

    if (!config || !config.token || !config.pdp) {
      throw new Error('Permit.io configuration not found');
    }

    return new Permit({
      token: config.token,
      pdp: config.pdp,
    });
  },

  /**
   * Save the configuration
   */
  async saveConfig(config: PermitConfig): Promise<{
    success: boolean;
    message: string;
    config?: Omit<PermitConfig, 'token'>;
  }> {
    if (!config.token || !config.pdp) {
      return {
        success: false,
        message: 'API key and PDP URL are required',
      };
    }

    try {
      const pluginStore = strapi.store({
        environment: '',
        type: 'plugin',
        name: 'permit-strapi',
      });

      await pluginStore.set({
        key: 'config',
        value: config,
      });

      return {
        success: true,
        message: 'Configuration saved successfully',
        config: {
          pdp: config.pdp,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Update the configuration
   */
  async updateConfig(config: Partial<PermitConfig>): Promise<{
    success: boolean;
    message: string;
    config?: Omit<PermitConfig, 'token'>;
  }> {
    try {
      // Get current config
      const currentConfig = await this.getConfig();

      if (!currentConfig) {
        return {
          success: false,
          message: 'No configuration exists to update',
        };
      }

      // Merge with new config
      const updatedConfig: PermitConfig = {
        ...currentConfig,
        ...config,
      };

      // Ensure required fields are still present
      if (!updatedConfig.token || !updatedConfig.pdp) {
        return {
          success: false,
          message: 'Cannot remove required fields (API key and PDP URL)',
        };
      }

      const pluginStore = strapi.store({
        environment: '',
        type: 'plugin',
        name: 'permit-strapi',
      });

      await pluginStore.set({
        key: 'config',
        value: updatedConfig,
      });

      return {
        success: true,
        message: 'Configuration updated successfully',
        config: {
          pdp: updatedConfig.pdp,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update configuration: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Delete the configuration
   */
  async deleteConfig(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const pluginStore = strapi.store({
        environment: '',
        type: 'plugin',
        name: 'permit-strapi',
      });

      // First check if config exists
      const currentConfig = await pluginStore.get({ key: 'config' });

      if (!currentConfig) {
        return {
          success: false,
          message: 'No configuration exists to delete',
        };
      }

      // Delete the configuration
      await pluginStore.delete({ key: 'config' });

      return {
        success: true,
        message: 'Configuration deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete configuration: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

export default configService;
