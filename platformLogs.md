Connected!
2026-04-22T05:30:34.8328239Z State: Starting, Action: EstablishingSiteNetworks, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: , DetailsLevel: INFO
2026-04-22T05:30:41.8112675Z State: Starting, Action: StartingSiteContainers, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: , DetailsLevel: INFO
2026-04-22T05:30:41.8319742Z Container start method called.
2026-04-22T05:30:41.8325445Z State: Starting, Action: PullingImage, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Pulling image 10.1.0.4:13209/appsvc/node:24-lts_20260115.4.tuxprod for freelancers., DetailsLevel: INFO
2026-04-22T05:30:41.841972Z Establishing network.
2026-04-22T05:30:41.9090905Z Pulling image: appsvc/node:24-lts_20260115.4.tuxprod.
2026-04-22T05:30:44.3635067Z Image appsvc/node:24-lts_20260115.4.tuxprod is pulled from registry 10.1.0.4:13209
2026-04-22T05:30:44.4305392Z Container is starting.
2026-04-22T05:30:44.4310461Z State: Starting, Action: MountingVolumes, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Mounting volumes for freelancers., DetailsLevel: INFO
2026-04-22T05:30:44.4312406Z Establishing user namespace if not established already.
2026-04-22T05:30:44.4510032Z Establishing network if not established already.
2026-04-22T05:30:44.4593278Z Mounting volumes.
2026-04-22T05:30:44.4933228Z Nested mountpoint
2026-04-22T05:30:44.5885228Z Nested mountpoint volatile/logs
2026-04-22T05:30:44.6393033Z Nested mountpoint
2026-04-22T05:30:44.7824935Z Nested mountpoint
2026-04-22T05:30:44.8889569Z Nested mountpoint
2026-04-22T05:30:48.2250534Z State: Starting, Action: CreatingContainer, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Finished pulling container image and mounting volumes for freelancers. Allocatinng the rest of the container resources to finish container creation., DetailsLevel: INFO
2026-04-22T05:30:48.2253029Z Creating container.
2026-04-22T05:30:48.2253937Z Creating pipes for streaming container io.
2026-04-22T05:30:48.2254693Z Creating stdout named pipe at /podr/container/pipe/0e9d12767434_freelancers/stdout_9c8302aa67c948a881cf081c8a9de4a5.
2026-04-22T05:30:48.2767165Z Successfully created stdout named pipe at: /podr/container/pipe/0e9d12767434_freelancers/stdout_9c8302aa67c948a881cf081c8a9de4a5.
2026-04-22T05:30:48.2770562Z Opening named pipe /podr/container/pipe/0e9d12767434_freelancers/stdout_9c8302aa67c948a881cf081c8a9de4a5 for reading in non-blocking mode.
2026-04-22T05:30:48.2771943Z Successfully opened named pipe: /podr/container/pipe/0e9d12767434_freelancers/stdout_9c8302aa67c948a881cf081c8a9de4a5.
2026-04-22T05:30:48.2773138Z Successfully removed non-blocking flag from /podr/container/pipe/0e9d12767434_freelancers/stdout_9c8302aa67c948a881cf081c8a9de4a5.
2026-04-22T05:30:48.3136875Z Creating stderr named pipe at /podr/container/pipe/0e9d12767434_freelancers/stderr_bd1a8172d1634066b1c1604f6f9804c5.
2026-04-22T05:30:48.313906Z Successfully created stderr named pipe at: /podr/container/pipe/0e9d12767434_freelancers/stderr_bd1a8172d1634066b1c1604f6f9804c5.
2026-04-22T05:30:48.3143679Z Opening named pipe /podr/container/pipe/0e9d12767434_freelancers/stderr_bd1a8172d1634066b1c1604f6f9804c5 for reading in non-blocking mode.
2026-04-22T05:30:48.3144812Z Successfully opened named pipe: /podr/container/pipe/0e9d12767434_freelancers/stderr_bd1a8172d1634066b1c1604f6f9804c5.
2026-04-22T05:30:48.3145688Z Successfully removed non-blocking flag from /podr/container/pipe/0e9d12767434_freelancers/stderr_bd1a8172d1634066b1c1604f6f9804c5.
2026-04-22T05:30:48.3235908Z Creating container with image: appsvc/node:24-lts_20260115.4.tuxprod from registry: 10.1.0.4:13209 and fully qualified image name: 10.1.0.4:13209/appsvc/node:24-lts_20260115.4.tuxprod
2026-04-22T05:30:53.3218814Z Starting container: 0e9d12767434_freelancers.
2026-04-22T05:30:53.541004Z Starting watchers and probes.
2026-04-22T05:30:53.6437547Z Starting metrics collection.
2026-04-22T05:30:53.6619238Z Container is running.
2026-04-22T05:30:53.6649517Z State: Starting, Action: CreatingContainer, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Container freelancers successfully created and is running., DetailsLevel: INFO
2026-04-22T05:30:54.1674789Z Container start method finished after 12314 ms.
2026-04-22T05:30:54.1678351Z State: Starting, Action: InitiatingSiteWarmUpProbe, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Container freelancers successfully created and is running., DetailsLevel: INFO
2026-04-22T05:30:54.1767199Z State: Starting, Action: WaitingForSiteWarmUpProbeSuccess, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Pinging warmup path to ensure container is ready to receive requests., DetailsLevel: INFO
2026-04-22T05:33:59.5202039Z Site startup probe succeeded after 185.0804041 seconds.
2026-04-22T05:34:01.1639344Z State: Starting, Action: WarmUpProbeSucceeded, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Site startup probe succeeded after 185.0804041 seconds., DetailsLevel: INFO
2026-04-22T05:34:05.6473421Z Site is running with deployment version: 0130a8f5-83e3-4329-b7f1-cada3766d661
2026-04-22T05:34:05.7100586Z Site started.
2026-04-22T05:34:05.7185905Z State: Started, Action: None, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Site started at 04/22/2026 05:34:05 (UTC), DetailsLevel: INFO
2026-04-22T05:34:05.78394Z Site is running with patch version NODE 24.13.0
2026-04-22T05:34:27.9319728Z State: Stopping, Action: StoppingSite, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Site started at 04/22/2026 03:58:55 (UTC), DetailsLevel: INFO
2026-04-22T05:34:28.4937009Z State: Stopping, Action: StoppingSiteContainers, LastError: , LastErrorTimestamp: 01/01/0001 00:00:00, LastErrorDetails: , Details: Site started at 04/22/2026 03:58:55 (UTC), DetailsLevel: INFO
2026-04-22T05:34:28.604296Z Container is terminating. Grace period: 5 seconds.
2026-04-22T05:34:30.4377583Z Stop and delete container. Retry count = 0
2026-04-22T05:34:30.4553941Z Stopping container: 3d4785922b72_freelancers.
2026-04-22T05:34:35.3159127Z Deleting container: 3d4785922b72_freelancers. Retry count = 0
2026-04-22T05:34:40.3894643Z Container spec TerminationMessagePolicy  path
2026-04-22T05:34:40.4549303Z Container is terminated. Total time elapsed: 11629 ms.
2026-04-22T05:34:40.5133887Z Site: freelancers stopped.
2026-04-22T05:35:57.2885514Z Container start method called.
2026-04-22T05:35:57.5512562Z Establishing network.
2026-04-22T05:35:57.5795245Z Pulling image: appsvc/kudulite:noble_20260323.3.tuxprod.
2026-04-22T05:35:58.2813523Z Container is starting.
2026-04-22T05:35:58.2817093Z Establishing user namespace if not established already.
2026-04-22T05:35:58.2818114Z Establishing network if not established already.
2026-04-22T05:35:58.2819399Z Mounting volumes.
2026-04-22T05:35:58.3579348Z Nested mountpoint
2026-04-22T05:35:58.5254832Z Nested mountpoint volatile/logs
2026-04-22T05:35:58.5464398Z Nested mountpoint
2026-04-22T05:35:58.6295175Z Nested mountpoint
2026-04-22T05:35:59.1462972Z Nested mountpoint
2026-04-22T05:35:59.1738446Z Nested mountpoint
2026-04-22T05:35:59.1834126Z Nested mountpoint
2026-04-22T05:35:59.2104896Z Creating container.
2026-04-22T05:35:59.2106228Z Creating pipes for streaming container io.
2026-04-22T05:35:59.2107505Z Creating stdout named pipe at /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stdout_a04a8a1b4a1640469325189cded5ae10.
2026-04-22T05:35:59.2189276Z Successfully created stdout named pipe at: /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stdout_a04a8a1b4a1640469325189cded5ae10.
2026-04-22T05:35:59.2191029Z Opening named pipe /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stdout_a04a8a1b4a1640469325189cded5ae10 for reading in non-blocking mode.
2026-04-22T05:35:59.2192652Z Successfully opened named pipe: /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stdout_a04a8a1b4a1640469325189cded5ae10.
2026-04-22T05:35:59.2194026Z Successfully removed non-blocking flag from /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stdout_a04a8a1b4a1640469325189cded5ae10.
2026-04-22T05:35:59.2196084Z Creating stderr named pipe at /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stderr_24042e7b71844eaa9ef460c070124c3b.
2026-04-22T05:35:59.2197845Z Successfully created stderr named pipe at: /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stderr_24042e7b71844eaa9ef460c070124c3b.
2026-04-22T05:35:59.2198941Z Opening named pipe /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stderr_24042e7b71844eaa9ef460c070124c3b for reading in non-blocking mode.
2026-04-22T05:35:59.2200142Z Successfully opened named pipe: /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stderr_24042e7b71844eaa9ef460c070124c3b.
2026-04-22T05:35:59.2201142Z Successfully removed non-blocking flag from /podr/container/pipe/390b5ad2efb6_freelancers_kudu/stderr_24042e7b71844eaa9ef460c070124c3b.
2026-04-22T05:35:59.23762Z Creating container with image: appsvc/kudulite:noble_20260323.3.tuxprod from registry: mcr.microsoft.com and fully qualified image name: mcr.microsoft.com/appsvc/kudulite:noble_20260323.3.tuxprod
2026-04-22T05:36:01.8812444Z Starting container: 390b5ad2efb6_freelancers_kudu.
2026-04-22T05:36:01.9759012Z Starting watchers and probes.
2026-04-22T05:36:01.9838063Z Starting metrics collection.
2026-04-22T05:36:01.9839782Z Container is running.
2026-04-22T05:36:02.2091106Z Container start method finished after 4919 ms.