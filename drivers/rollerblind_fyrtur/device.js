'use strict';

const { CLUSTER } = require('zigbee-clusters');
const { debug } = require('zigbee-clusters');
const GenericRollerBlindDevice = require('../../lib/GenericRollerBlindDevice');

debug(true);

class RollerBlindFyrtur extends GenericRollerBlindDevice {

  async onNodeInit({ zclNode }) {
    // This value is set by the system set parser in order to know whether command was sent from
    // Homey
    this._reportDebounceEnabled = false;
    // zclNode.endpoints[1].clusters.windowCovering.downClose();
    // await new Promise((resolve) => setTimeout(resolve, 5000));
    // zclNode.endpoints[1].clusters.windowCovering.stop();

    // zclNode.endpoints[1].clusters.windowCovering.upOpen();

    const triggerRollerSimpleAction = value => {
      switch (value) {
        case 'up':
          return zclNode.endpoints[1].clusters.windowCovering.upOpen();

        case 'stop':
          return zclNode.endpoints[1].clusters.windowCovering.stop();

        case 'down':
          return zclNode.endpoints[1].clusters.windowCovering.downClose();

        default:
          throw new Error('Action not available');
      }
    };

    const stopRainingAction = this.homey.flow.getActionCard(
      'simple-blind-actions',
    );
    stopRainingAction.registerRunListener(async args => {
      triggerRollerSimpleAction(args.action);
    });

    await this.configureAttributeReporting([
      {
        cluster: CLUSTER.WINDOW_COVERING,
        attributeName: 'currentPositionLiftPercentage',
        minInterval: 0,
        maxInterval: 300,
        minChange: 10,
      },
    ]);
    // Register windowcoverings set capability and configure attribute reporting
    await this.registerCapability(
      'windowcoverings_set',
      CLUSTER.WINDOW_COVERING,
      {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 60000, // Maximally every ~16 hours
            minChange: 5, // Report when value changed by 5
          },
        },
      },
    );

    this.registerCapabilityListener('up_down_stop_capabiltity', value => triggerRollerSimpleAction(value));

    // Refactored measure_battery to alarm battery, not all devices will have this capability
    if (this.hasCapability('alarm_battery')) {
      // Set battery threshold under which the alarm should go off
      this.batteryThreshold = 20;

      // Register measure_battery capability and configure attribute reporting
      this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
        getOpts: {
          getOnStart: true,
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 60000, // Maximally every ~16 hours
            minChange: 5, // Report when value changed by 5
          },
        },
      });
    }

    // Legacy: used to have measure_battery capability, removed due to inaccurate readings
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        getOpts: {
          getOnStart: true,
        },
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 0, // No minimum reporting interval
            maxInterval: 60000, // Maximally every ~16 hours
            minChange: 5, // Report when value changed by 5
          },
        },
      });
    }
  }

}

module.exports = RollerBlindFyrtur;
