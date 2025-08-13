#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedHydrationModule, NSObject)
RCT_EXTERN_METHOD(write:(nonnull NSNumber *)consumedOz
                  goalOz:(nonnull NSNumber *)goalOz
       nextDrinkMinutes:(nullable NSNumber *)nextDrinkMinutes)
RCT_EXTERN_METHOD(forceReload)
+ (BOOL)requiresMainQueueSetup { return YES; }
@end 