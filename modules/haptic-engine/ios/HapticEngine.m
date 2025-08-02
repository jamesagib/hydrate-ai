#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(HapticEngine, RCTEventEmitter)

RCT_EXTERN_METHOD(playProgressiveHaptic:(float)intensity
                  sharpness:(float)sharpness)

RCT_EXTERN_METHOD(playImpactHaptic:(NSString *)style)

RCT_EXTERN_METHOD(playNotificationHaptic:(NSString *)type)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end 